import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { fetchProducts } from '../api/catalog';
import { enqueueActivation, getActiveActivation } from '../offline/activationsQueue';
import { cacheProducts, getCachedProducts } from '../offline/productCatalog';
import { initDb } from '../offline/db';
import { isRouteTrackingActive, startRouteTracking, stopRouteTracking } from '../location/gpsTracker';
import CameraCapture from '../components/CameraCapture';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import PrimaryButton from '../components/PrimaryButton';
import { ErrorState, LoadingState } from '../components/ScreenState';
import { createLocalId } from '../utils/ids';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, typography } from '../theme/tokens';
import CampaignPicker from '../components/CampaignPicker';

const ACTIVITY_TYPES = [
  ['product_sampling', 'Product sampling'],
  ['roadshow', 'Roadshow'],
  ['in_store_demo', 'In-store demo'],
  ['street_activation', 'Street activation'],
];
const EXPENSE_TYPES = ['transport', 'meals', 'venue', 'supplies', 'other'];
const SURVEY_QUESTIONS = [
  { id: 'brand-awareness', prompt: 'Had you heard of this brand before today?' },
  { id: 'purchase-interest', prompt: 'How likely are you to try or buy this product?' },
  { id: 'consumer-feedback', prompt: 'What feedback did the consumer share?' },
];

function emptyActivation(activityType) {
  return {
    campaignId: null,
    activityType,
    status: 'draft',
    location: { latitude: 0, longitude: 0 },
    startedAt: new Date().toISOString(),
    endedAt: null,
    footfallCount: 0,
    media: [],
    surveyResponses: [],
    samplesDistributed: [],
    floatAmount: 0,
    expenses: [],
  };
}

export default function ActivationEntryScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [activation, setActivation] = useState(null);
  const [localId, setLocalId] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(ACTIVITY_TYPES[0][0]);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [sampleQuantity, setSampleQuantity] = useState('1');
  const [floatText, setFloatText] = useState('');
  const [footfallText, setFootfallText] = useState('0');
  const [surveyDrafts, setSurveyDrafts] = useState({});
  const [expenseType, setExpenseType] = useState(EXPENSE_TYPES[0]);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseReceiptUri, setExpenseReceiptUri] = useState(null);
  const [expenseReceiptMediaId, setExpenseReceiptMediaId] = useState(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [savingReceipt, setSavingReceipt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const expenseTotal = useMemo(
    () => (activation?.expenses || []).reduce((total, expense) => total + Number(expense.amount || 0), 0),
    [activation],
  );

  useEffect(() => {
    let mounted = true;
    initDb();
    async function load() {
      const saved = getActiveActivation();
      if (saved && mounted) {
        setLocalId(saved.localId);
        setActivation(saved.payload);
        setSelectedActivity(saved.payload.activityType);
        setSelectedCampaignId(saved.payload.campaignId || null);
        setFootfallText(String(saved.payload.footfallCount || 0));
        setFloatText(String(saved.payload.floatAmount || 0));
        try {
          setTracking(await isRouteTrackingActive());
        } catch {
          setTracking(false);
        }
      }
      try {
        const catalog = await fetchProducts();
        cacheProducts(catalog);
        if (mounted) setProducts(catalog);
      } catch {
        const cached = getCachedProducts();
        if (mounted) {
          setProducts(cached);
          if (!cached.length) setNotice('Product catalog is unavailable offline. Samples can be added after reconnecting.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load().catch(() => {
      if (mounted) {
        setError('Activation data could not be loaded.');
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  function persist(next) {
    setActivation(next);
    if (localId) enqueueActivation(localId, next);
  }

  function updateField(field, value) {
    if (!activation) return;
    persist({ ...activation, [field]: value });
  }

  async function startActivation() {
    setStarting(true);
    setError(null);
    setNotice(null);
    let trackingStarted = false;
    try {
      const startedAt = new Date().toISOString();
      await startRouteTracking();
      trackingStarted = true;
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const id = createLocalId();
      const draft = {
        ...emptyActivation(selectedActivity),
        campaignId: selectedCampaignId,
        startedAt,
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
      };
      enqueueActivation(id, draft);
      setLocalId(id);
      setActivation(draft);
      setTracking(true);
      setNotice('Activation started. Drafts, GPS pings, and captured evidence are saved locally for sync.');
    } catch (startError) {
      let message = startError.message || 'Unable to start activation. Check location permissions and try again.';
      if (trackingStarted) {
        try {
          await stopRouteTracking();
        } catch (stopError) {
          message += ` GPS cleanup also failed: ${stopError.message || 'unknown error'}.`;
        }
      }
      setError(message);
    } finally {
      setStarting(false);
    }
  }

  async function resumeTracking() {
    setStarting(true);
    setError(null);
    try {
      await startRouteTracking();
      setTracking(true);
      setNotice('GPS tracking resumed for this activation.');
    } catch (trackingError) {
      setError(trackingError.message || 'Unable to resume location tracking.');
    } finally {
      setStarting(false);
    }
  }

  async function endActivation() {
    if (!activation || !localId) return;
    if (!/^\d+$/.test(footfallText) || !Number.isFinite(Number(floatText)) || Number(floatText) < 0) {
      setError('Enter a whole non-negative footfall count and a valid starting float.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await stopRouteTracking();
      const submitted = {
        ...activation,
        status: 'submitted',
        endedAt: new Date().toISOString(),
        floatRemaining: Number(activation.floatAmount || 0) - expenseTotal,
      };
      enqueueActivation(localId, submitted);
      setActivation(submitted);
      setTracking(false);
      setNotice('Activation submitted and queued for secure sync.');
      navigation.goBack();
    } catch (submitError) {
      setError(submitError.message || 'Unable to end activation. Your draft is still saved.');
    } finally {
      setSubmitting(false);
    }
  }

  function addSurveyResponse(questionId) {
    const draft = surveyDrafts[questionId] || {};
    if (!draft.answer?.trim()) {
      setError('Enter a survey response before saving it.');
      return;
    }
    if (!draft.respondentConsent) {
      setError('Confirm respondent consent before saving this survey response.');
      return;
    }
    const next = [
      ...(activation.surveyResponses || []).filter((response) => response.questionId !== questionId),
      {
        questionId,
        answer: draft.answer.trim(),
        respondentConsent: true,
        capturedAt: new Date().toISOString(),
      },
    ];
    updateField('surveyResponses', next);
    setError(null);
    setNotice('Survey response saved to the activation draft.');
  }

  function addSample() {
    const quantity = Number(sampleQuantity);
    if (!selectedProductId || !Number.isFinite(quantity) || quantity <= 0) {
      setError('Choose a product and enter a quantity greater than zero.');
      return;
    }
    updateField('samplesDistributed', [
      ...(activation.samplesDistributed || []),
      { productId: selectedProductId, quantity, unit: 'piece' },
    ]);
    setSampleQuantity('1');
    setError(null);
  }

  function addExpense() {
    const amount = Number(expenseAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Enter a valid expense amount in KES.');
      return;
    }
    updateField('expenses', [
      ...(activation.expenses || []),
      {
        expenseType,
        amount,
        ...(expenseDescription.trim() ? { description: expenseDescription.trim() } : {}),
        ...(expenseReceiptUri ? {
          receiptStorageUri: expenseReceiptUri,
          receiptMediaId: expenseReceiptMediaId,
        } : {}),
        incurredAt: new Date().toISOString(),
      },
    ]);
    setExpenseAmount('');
    setExpenseDescription('');
    setExpenseReceiptUri(null);
    setExpenseReceiptMediaId(null);
    setError(null);
  }

  async function persistPhoto(uri, mediaId) {
    const directory = `${FileSystem.documentDirectory}activations/`;
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    const destination = `${directory}${mediaId}.jpg`;
    await FileSystem.copyAsync({ from: uri, to: destination });
    return destination;
  }

  async function captureMedia(uri) {
    const mediaId = createLocalId();
    setSavingPhoto(true);
    setError(null);
    try {
      const storageUri = await persistPhoto(uri, mediaId);
      updateField('media', [
        ...(activation.media || []),
        {
          mediaId,
          storageUri,
          mediaType: 'photo',
          contentType: 'image/jpeg',
          capturedAt: new Date().toISOString(),
        },
      ]);
    } catch (saveError) {
      setError(saveError.message || 'Could not save the activation photo on this device.');
    } finally {
      setSavingPhoto(false);
    }
  }

  async function captureExpenseReceipt(uri) {
    const mediaId = createLocalId();
    setSavingReceipt(true);
    setError(null);
    try {
      const localUri = await persistPhoto(uri, mediaId);
      setExpenseReceiptUri(localUri);
      setExpenseReceiptMediaId(mediaId);
    } catch (saveError) {
      setError(saveError.message || 'Could not save the receipt photo on this device.');
    } finally {
      setSavingReceipt(false);
    }
  }

  if (loading) return <LoadingState colors={colors} label="Preparing activation…" />;
  if (!activation) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>Start a field activation</Text>
          <Text style={styles.copy}>Choose the activity type. Location tracking starts when you begin and continues until you submit.</Text>
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Activity type</Text>
            <ChoiceList
              values={ACTIVITY_TYPES}
              selected={selectedActivity}
              onSelect={setSelectedActivity}
              colors={colors}
              styles={styles}
            />
            <CampaignPicker value={selectedCampaignId} onChange={setSelectedCampaignId} />
            <PrimaryButton title="Start activation and GPS" onPress={startActivation} loading={starting} />
          </Card>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>Activation in progress</Text>
          <Text style={styles.copy}>Your route is being recorded in the existing GPS queue. Entries below are saved locally as you work.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          <Card style={styles.card}>
            <View style={styles.topRow}>
              <View style={styles.copyBlock}>
                <Text style={styles.activityTitle}>{activityLabel(activation.activityType)}</Text>
                <Text style={styles.meta}>Started {safeDate(activation.startedAt)}</Text>
              </View>
              <View style={[styles.liveBadge, tracking ? styles.liveOn : styles.liveOff]}>
                <Text style={styles.liveText}>{tracking ? 'GPS ON' : 'GPS PAUSED'}</Text>
              </View>
            </View>
            {!tracking ? <PrimaryButton title="Resume GPS tracking" variant="secondary" onPress={resumeTracking} loading={starting} /> : null}
            <Text style={styles.meta}>GPS pin {activation.location.latitude.toFixed(5)}, {activation.location.longitude.toFixed(5)}</Text>
          </Card>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Activation details</Text>
            <CampaignPicker value={activation.campaignId || null} onChange={(campaignId) => updateField('campaignId', campaignId)} />
            <Text style={styles.label}>ACTIVITY TYPE</Text>
            <ChoiceList values={ACTIVITY_TYPES} selected={activation.activityType} onSelect={(value) => updateField('activityType', value)} colors={colors} styles={styles} />
            <Text style={styles.label}>FOOTFALL / CONSUMERS REACHED</Text>
            <View style={styles.counterRow}>
              <Pressable onPress={() => {
                const value = Math.max(0, Number(footfallText || 0) - 1);
                setFootfallText(String(value));
                updateField('footfallCount', value);
              }} style={styles.counterButton}><Text style={styles.counterText}>−</Text></Pressable>
              <TextInput
                value={footfallText}
                onChangeText={(value) => {
                  setFootfallText(value);
                  const count = Number.parseInt(value, 10);
                  if (Number.isInteger(count) && count >= 0) updateField('footfallCount', count);
                }}
                keyboardType="number-pad"
                style={styles.counterInput}
              />
              <Pressable onPress={() => {
                const value = Number(footfallText || 0) + 1;
                setFootfallText(String(value));
                updateField('footfallCount', value);
              }} style={styles.counterButton}><Text style={styles.counterText}>+</Text></Pressable>
            </View>
          </Card>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <Text style={styles.meta}>Photos are kept on this device until uploaded; video capture is deferred.</Text>
            {savingPhoto ? <Text style={styles.meta}>Saving photo for offline sync…</Text> : null}
            <CameraCapture onCapture={captureMedia} />
            {(activation.media || []).map((item) => (
              <View key={item.mediaId || item.storageUri} style={styles.mediaRow}>
                <Image source={{ uri: item.storageUri }} style={styles.thumbnail} />
                <Text style={styles.meta}>Photo evidence</Text>
                <Pressable onPress={() => updateField('media', activation.media.filter((media) => media !== item))}>
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </Card>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Consumer feedback</Text>
            {SURVEY_QUESTIONS.map((question) => {
              const existing = activation.surveyResponses.find((response) => response.questionId === question.id);
              const draft = surveyDrafts[question.id] || {
                answer: existing?.answer || '',
                respondentConsent: existing?.respondentConsent || false,
              };
              return (
                <View key={question.id} style={styles.question}>
                  <Text style={styles.questionText}>{question.prompt}</Text>
                  <TextInput
                    value={draft.answer}
                    onChangeText={(answer) => setSurveyDrafts({ ...surveyDrafts, [question.id]: { ...draft, answer } })}
                    style={styles.input}
                    placeholder="Record the response"
                    placeholderTextColor={colors.muted}
                  />
                  <View style={styles.consentRow}>
                    <Text style={styles.meta}>Respondent consent given</Text>
                    <Switch
                      value={draft.respondentConsent}
                      onValueChange={(respondentConsent) => setSurveyDrafts({ ...surveyDrafts, [question.id]: { ...draft, respondentConsent } })}
                      trackColor={{ false: colors.border, true: colors.primarySoft }}
                      thumbColor={draft.respondentConsent ? colors.primary : colors.surface}
                    />
                  </View>
                  <PrimaryButton title={existing ? 'Update response' : 'Save response'} variant="secondary" onPress={() => addSurveyResponse(question.id)} />
                </View>
              );
            })}
          </Card>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Samples distributed</Text>
            {!products.length ? <EmptyState title="Product catalog unavailable" message="Connect to download the product catalog before logging samples." /> : null}
            {products.map((product) => (
              <Pressable
                key={product.id}
                onPress={() => setSelectedProductId(product.id)}
                style={[styles.productOption, selectedProductId === product.id && styles.productSelected]}
              >
                <Text style={[styles.productName, selectedProductId === product.id && styles.productNameSelected]}>{product.name}</Text>
                <Text style={styles.meta}>{product.sku}</Text>
              </Pressable>
            ))}
            <Text style={styles.label}>QUANTITY</Text>
            <TextInput value={sampleQuantity} onChangeText={setSampleQuantity} keyboardType="decimal-pad" style={styles.input} />
            <PrimaryButton title="Add distributed samples" onPress={addSample} disabled={!products.length} variant="secondary" />
            {(activation.samplesDistributed || []).map((sample, index) => (
              <View key={`${sample.productId}-${index}`} style={styles.listRow}>
                <Text style={styles.meta}>{products.find((product) => product.id === sample.productId)?.name || sample.productId}</Text>
                <Text style={styles.value}>{sample.quantity} {sample.unit || 'units'}</Text>
              </View>
            ))}
          </Card>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Float and expenses (KES)</Text>
            <Text style={styles.label}>STARTING FLOAT</Text>
            <TextInput
              value={floatText}
              onChangeText={(value) => {
                setFloatText(value);
                const amount = Number(value);
                if (Number.isFinite(amount) && amount >= 0) updateField('floatAmount', amount);
              }}
              keyboardType="decimal-pad"
              style={styles.input}
              placeholder="0.00"
            />
            <Text style={styles.meta}>Remaining float estimate: {(Number(activation.floatAmount || 0) - expenseTotal).toFixed(2)} KES</Text>
            <Text style={styles.label}>EXPENSE CATEGORY</Text>
            <ChoiceList
              values={EXPENSE_TYPES.map((value) => [value, title(value)])}
              selected={expenseType}
              onSelect={setExpenseType}
              colors={colors}
              styles={styles}
            />
            <Text style={styles.label}>AMOUNT (KES)</Text>
            <TextInput value={expenseAmount} onChangeText={setExpenseAmount} keyboardType="decimal-pad" style={styles.input} placeholder="0.00" />
            <Text style={styles.label}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput value={expenseDescription} onChangeText={setExpenseDescription} style={styles.input} placeholder="Expense details" />
            <Text style={styles.label}>RECEIPT PHOTO (OPTIONAL)</Text>
            {savingReceipt ? <Text style={styles.meta}>Saving receipt for offline sync…</Text> : null}
            <CameraCapture onCapture={captureExpenseReceipt} />
            {expenseReceiptUri ? <Image source={{ uri: expenseReceiptUri }} style={styles.receiptPreview} /> : null}
            <PrimaryButton title="Add expense" onPress={addExpense} variant="secondary" />
            {(activation.expenses || []).map((expense, index) => (
              <View key={`${expense.incurredAt}-${index}`} style={styles.listRow}>
                <Text style={styles.meta}>{title(expense.expenseType)}{expense.description ? ` · ${expense.description}` : ''}</Text>
                <Text style={styles.value}>{Number(expense.amount).toFixed(2)}</Text>
              </View>
            ))}
          </Card>

          <PrimaryButton title="End activation and submit" onPress={endActivation} loading={submitting} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ChoiceList({ values, selected, onSelect, colors, styles }) {
  return (
    <View style={styles.choices}>
      {values.map(([value, label]) => (
        <Pressable
          key={value}
          onPress={() => onSelect(value)}
          style={[styles.choice, selected === value && { backgroundColor: colors.primary, borderColor: colors.primary }]}
        >
          <Text style={[styles.choiceText, selected === value && { color: colors.white }]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function activityLabel(value) {
  return ACTIVITY_TYPES.find(([key]) => key === value)?.[1] || title(value);
}

function title(value) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeDate(value) {
  const seconds = value?.seconds ?? value?._seconds;
  const date = new Date(typeof seconds === 'number' ? seconds * 1000 : value);
  return Number.isNaN(date.getTime()) ? 'time unavailable' : date.toLocaleString();
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  heading: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.title },
  copy: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: typography.small, lineHeight: 20 },
  card: { gap: spacing.sm },
  sectionTitle: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3 },
  label: { color: colors.muted, fontFamily: typography.fontFamilyExtraBold, fontSize: 10, letterSpacing: 1, marginTop: spacing.xs },
  meta: { color: colors.muted, fontFamily: typography.fontFamily, fontSize: 12, lineHeight: 18 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  copyBlock: { flex: 1 },
  activityTitle: { color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: typography.h3 },
  liveBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill },
  liveOn: { backgroundColor: colors.successSoft },
  liveOff: { backgroundColor: colors.warningSoft },
  liveText: { color: colors.primary, fontFamily: typography.fontFamilyExtraBold, fontSize: 10 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  choice: { paddingHorizontal: spacing.sm, paddingVertical: 9, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, backgroundColor: colors.surface },
  choiceText: { color: colors.ink, fontFamily: typography.fontFamilySemiBold, fontSize: 12 },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  counterButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  counterText: { color: colors.primaryDark, fontSize: 25, fontWeight: '700' },
  counterInput: { minWidth: 100, minHeight: 52, color: colors.ink, fontFamily: typography.fontFamilyExtraBold, fontSize: 25, textAlign: 'center', borderBottomWidth: 1, borderColor: colors.border },
  mediaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  thumbnail: { width: 58, height: 58, borderRadius: radius.sm, backgroundColor: colors.border },
  remove: { color: colors.error, fontFamily: typography.fontFamilyBold, fontSize: 12 },
  question: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  questionText: { color: colors.ink, fontFamily: typography.fontFamilySemiBold, fontSize: typography.small },
  consentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: { minHeight: 46, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.ink, backgroundColor: colors.surface },
  productOption: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface },
  productSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  productName: { flex: 1, color: colors.ink, fontFamily: typography.fontFamilySemiBold, fontSize: 13 },
  productNameSelected: { color: colors.primaryDark },
  listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  value: { color: colors.primary, fontFamily: typography.fontFamilyBold, fontSize: 13 },
  receiptPreview: { width: '100%', height: 150, borderRadius: radius.md, backgroundColor: colors.border },
  notice: { color: colors.success, fontFamily: typography.fontFamilySemiBold, fontSize: typography.small },
  error: { color: colors.error, fontFamily: typography.fontFamilySemiBold, fontSize: typography.small },
});

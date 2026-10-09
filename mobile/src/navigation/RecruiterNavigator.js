import React from 'react';
import {StyleSheet} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import RecruiterHomeScreen from '../screens/RecruiterHomeScreen';
import RecruiterApplicantsScreen from '../screens/RecruiterApplicantsScreen';
import NewApplicantScreen from '../screens/NewApplicantScreen';
import RoleMoreScreen from '../screens/RoleMoreScreen';
import BroadcastFeedScreen from '../screens/BroadcastFeedScreen';
import FieldRequestScreen from '../screens/FieldRequestScreen';
import {useTheme} from '../theme/ThemeContext';
import {typography} from '../theme/tokens';

const Tab=createBottomTabNavigator();const Stack=createNativeStackNavigator();
function Home(){const {colors}=useTheme();return <Stack.Navigator screenOptions={{headerShown:false,contentStyle:{backgroundColor:colors.background}}}><Stack.Screen name="RecruiterHome" component={RecruiterHomeScreen}/><Stack.Screen name="NewApplicant" component={NewApplicantScreen} options={{headerShown:true,title:'New applicant'}}/></Stack.Navigator>}
function Applicants(){const {colors}=useTheme();return <Stack.Navigator screenOptions={{headerStyle:{backgroundColor:colors.surface},headerTintColor:colors.ink,headerTitleStyle:styles.title,contentStyle:{backgroundColor:colors.background}}}><Stack.Screen name="ApplicantsList" component={RecruiterApplicantsScreen} options={{headerShown:false}}/><Stack.Screen name="NewApplicant" component={NewApplicantScreen} options={{title:'New applicant'}}/></Stack.Navigator>}
function More(){const {colors}=useTheme();return <Stack.Navigator screenOptions={{headerStyle:{backgroundColor:colors.surface},headerTintColor:colors.ink,headerTitleStyle:styles.title}}><Stack.Screen name="MoreSettings" component={RoleMoreScreen} options={{title:'Account'}}/><Stack.Screen name="BroadcastFeed" component={BroadcastFeedScreen} options={{title:'Team announcements'}}/><Stack.Screen name="FieldRequest" component={FieldRequestScreen} options={{title:'Field requests'}}/></Stack.Navigator>}
export default function RecruiterNavigator(){const {colors}=useTheme();return <Tab.Navigator screenOptions={({route})=>({headerShown:false,tabBarActiveTintColor:colors.primary,tabBarInactiveTintColor:colors.muted,tabBarStyle:{backgroundColor:colors.surface,borderTopColor:colors.border},tabBarLabelStyle:styles.label,tabBarIcon:({color,size})=><Ionicons name={{Home:'home-outline',Applicants:'people-outline',Account:'person-circle-outline'}[route.name]} color={color} size={size}/>})}><Tab.Screen name="Home" component={Home}/><Tab.Screen name="Applicants" component={Applicants}/><Tab.Screen name="Account" component={More}/></Tab.Navigator>}
const styles=StyleSheet.create({title:{fontFamily:typography.fontFamilyExtraBold},label:{fontFamily:typography.fontFamilySemiBold,fontSize:11,fontWeight:'600'}});

// import React, { useState } from 'react'
// import Background1 from '../components/Background1'
// import BackButton from '../components/BackButton'
// import Logo from '../components/Logo'
// import Header from '../components/Header'
// import TextInput from '../components/TextInput'
// import Button2 from '../components/Button'
// import { nameValidator } from '../helpers/nameValidator';
// import {numberValidator} from '../helpers/numberValidator';
// import {fieldValidator} from '../helpers/fieldValidator';
// import { baseUrl } from '../components/Global';
// import defaultMessages from '../helpers/defaultMessages';

// import {
//   StyleSheet,
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   AppState,
//   TouchableWithoutFeedback
// } from 'react-native';
// import {Appbar,Button} from 'react-native-paper';

// const VerifyOtpScreen = ({ navigation }) => {
//   const [otp, setOTP] = useState({ value: '', error: '' })

//   const verifyOtp = () => {
//     //const mobileError = nameValidator(mobile.value)
//     if (!fieldValidator(otp.value)) {
//       setOTP({ ...otp, error: defaultMessages.en.required.replace('{0}','OTP') })
//       return
//     } else if (!numberValidator(otp.value,"mobile")) {
//       setOTP({ ...otp, error: defaultMessages.en.minlength.replace('{0}','OTP').replace('{1}','6') })
//       return
//     }
//     // if (mobileError) {
//     //   setMobile({ ...mobile, error: mobileError })
//     //   return
//     // }
//     navigation.navigate('SetPasswordScreen')
//   }

//   const onclickChange=()=>{

//     navigation.reset({
//         index: 0,
//         routes: [{name: 'LoginScreen'}],
//       });
//   }

//   return (
//     <View style={{flex: 1,backgroundColor: 'white'}}>
//     <View style={{width: '100%', marginTop: 0}}>

//         <Appbar.Header style={{backgroundColor: 'transparent'}} >
            
//             <Appbar.BackAction color='#2DA3FC' onPress={() => navigation.goBack()} />
//             <Appbar.Content
//               style={{alignItems: 'center'}}
//               color='#2DA3FC'
//               title="Verify OTP"
//               titleStyle={{fontSize:16,fontWeight:'bold'}}
//             />
//             <Appbar.Action  color="transparent" onPress={() => { }} />
//           </Appbar.Header>


//         </View>

// <View style={{flex: 1, marginTop:'25%',marginLeft:'5%',marginRight:'5%'}}>
    

//     <Text style={{ color:"#2DA3FC",textAlign: 'center',  }}  >We sent a verification code on +91 9545695456</Text>
//     <Button mode="text" uppercase={false} color="#2DA3FC" onPress={() => {navigation.reset({
//         index: 0,
//         routes: [{name: 'LoginScreen'}],
//       });}  } >Change</Button>
      
//       <TextInput
//         label="OTP"
//         returnKeyType="done"
//         value={otp.value}
//         onChangeText={(text) => setOTP({ value: text, error: '' })}
//         error={!!otp.error}
//         errorText={otp.error}
//         autoCapitalize="none"
//         keyboardType='phone-pad'
//         maxLength={6}
//       />
//       <Button2
//         mode="contained"
//         onPress={verifyOtp}
//         style={{ marginTop: 16 }}
//       >
//         Verify
//       </Button2>
// </View>

//     </View>
//   )
// }

// export default VerifyOtpScreen

import React, {useState, useRef, useEffect} from 'react';
import PropTypes from 'prop-types';
import {StyleSheet, View, ActivityIndicator,ScrollView} from 'react-native';
import RNOtpVerify from 'react-native-otp-verify';
import {Appbar} from 'react-native-paper';
import {GenericStyles} from '../styles/GenericStyles';
import {
  NavigationHeader,
  CustomScreenContainer,
  CustomText,
  CustomTextInput,
  CustomButton,
  FullButtonComponent,
} from '../lib';
import ErrorBoundary from '../common/ErrorBoundary';
import colors from '../common/colors';
import {isAndroid, logErrorWithMessage} from '../utilities/helperFunctions';
import TimerText from '../components/otp/TimerText';
import api_config from '../Api/api';
import axios from 'axios';
import EncryptedStorage from 'react-native-encrypted-storage';
import Spinner from 'react-native-loading-spinner-overlay';
import { useNavigation } from '@react-navigation/native';

const RESEND_OTP_TIME_LIMIT = 30; // 30 secs
const AUTO_SUBMIT_OTP_TIME_LIMIT = 4; // 4 secs

let resendOtpTimerInterval;
let autoSubmitOtpTimerInterval;
import VerifyOtpIcon from '../assets/VerifyOtp';

const VerifyOtpScreen = function(props) {
  const {otpRequestData, attempts} = props;
  const navigation = useNavigation();
  const [attemptsRemaining, setAttemptsRemaining] = useState(attempts);
  const [otpArray, setOtpArray] = useState(['', '', '', '','', '']);
  const [submittingOtp, setSubmittingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  // in secs, if value is greater than 0 then button will be disabled
  const [resendButtonDisabledTime, setResendButtonDisabledTime] = useState(
    RESEND_OTP_TIME_LIMIT,
  );

  // 0 < autoSubmitOtpTime < 4 to show auto submitting OTP text
  const [autoSubmitOtpTime, setAutoSubmitOtpTime] = useState(
    AUTO_SUBMIT_OTP_TIME_LIMIT,
  );

  // TextInput refs to focus programmatically while entering OTP
  const firstTextInputRef = useRef(null);
  const secondTextInputRef = useRef(null);
  const thirdTextInputRef = useRef(null);
  const fourthTextInputRef = useRef(null);
  const fifthTextInputRef = useRef(null);
  const sixthTextInputRef = useRef(null);
  const [screenName, setScreenName] = useState('');
  // a reference to autoSubmitOtpTimerIntervalCallback to always get updated value of autoSubmitOtpTime
  const autoSubmitOtpTimerIntervalCallbackReference = useRef();

  useEffect(() => {
    // autoSubmitOtpTime value will be set after otp is detected,
    // in that case we have to start auto submit timer
    autoSubmitOtpTimerIntervalCallbackReference.current = autoSubmitOtpTimerIntervalCallback;
  });

  useEffect(() => {
    getScreenName()
    startResendOtpTimer();

    return () => {
      if (resendOtpTimerInterval) {
        clearInterval(resendOtpTimerInterval);
      }
    };
  }, [resendButtonDisabledTime]);

  useEffect(async () => {
    //getOTPText();
    setSubmittingOtp(true)
    setMobileNumber(await EncryptedStorage.getItem("user_mobile_number"))
  }, []);

  async function getOTPText() { 
    // docs: https://github.com/faizalshap/react-native-otp-verify
    
    RNOtpVerify.getOtp()
      .then(p =>
        RNOtpVerify.addListener(message => {
          try {
            if (message) {
              const messageArray = message.split('\n');
              if (messageArray[2]) {
                const otp = messageArray[2].split(' ')[0];
                if (otp.length === 4) {
                  setOtpArray(otp.split(''));

                  // to auto submit otp in 4 secs
                  setAutoSubmitOtpTime(AUTO_SUBMIT_OTP_TIME_LIMIT);
                  startAutoSubmitOtpTimer();
                }
              }
            }
          } catch (error) {
            alert("Error: " + error);
            logErrorWithMessage(
              error.message,
              'RNOtpVerify.getOtp - read message, OtpVerification',
            );
          }
        }),
      )
      .catch(error => {
        logErrorWithMessage(
          error.message,
          'RNOtpVerify.getOtp, OtpVerification',
        );
      });

    // remove listener on unmount
    return () => {
      RNOtpVerify.removeListener();
    };
  };

  const startResendOtpTimer = () => {
    if (resendOtpTimerInterval) {
      clearInterval(resendOtpTimerInterval);
    }
    resendOtpTimerInterval = setInterval(() => {
      if (resendButtonDisabledTime <= 0) {
        clearInterval(resendOtpTimerInterval);
      } else {
        setResendButtonDisabledTime(resendButtonDisabledTime - 1);
      }
    }, 1000);
  };

  // this callback is being invoked from startAutoSubmitOtpTimer which itself is being invoked from useEffect
  // since useEffect use closure to cache variables data, we will not be able to get updated autoSubmitOtpTime value
  // as a solution we are using useRef by keeping its value always updated inside useEffect(componentDidUpdate)
  const autoSubmitOtpTimerIntervalCallback = () => {
    if (autoSubmitOtpTime <= 0) {
      clearInterval(autoSubmitOtpTimerInterval);

      // submit OTP
      onSubmitButtonPress();
    }
    setAutoSubmitOtpTime(autoSubmitOtpTime - 1);
  };

  const startAutoSubmitOtpTimer = () => {
    if (autoSubmitOtpTimerInterval) {
      clearInterval(autoSubmitOtpTimerInterval);
    }
    autoSubmitOtpTimerInterval = setInterval(() => {
      autoSubmitOtpTimerIntervalCallbackReference.current();
    }, 1000);
  };

  const refCallback = textInputRef => node => {
    textInputRef.current = node;
  };

  const onResendOtpButtonPress = () => {
    // clear last OTP
    if (firstTextInputRef) {
      setOtpArray(['', '', '', '', '', '']);
      firstTextInputRef.current.focus();
    }

    setResendButtonDisabledTime(RESEND_OTP_TIME_LIMIT);
    resendOTPApiCall();

    // resend OTP Api call
    // todo
    console.log('todo: Resend OTP');
  };

  const resendOTPApiCall = () => {
    startResendOtpTimer();
    setLoading(true);
    let data = {mobile_number:mobileNumber}

    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    
    axios({
      url    : api_config.BASE_URL+api_config.RESEND_OTP,
      method : 'POST',
      data   : formData,
      headers: { Accept: 'application/json', 'Content-Type': 'multipart/form-data' }
    })
      .then(function (response) {
            setLoading(false)
            console.log("response :", response.data.status);
            if(response.data.status == 200) {
                 //getOTPText();
            } else {
              alert(response.data.message)
            }
        })
        .catch(function (error) {
            setLoading(false)
            alert(defaultMessages.en.serverNotRespondingMsg);
    })
  };

  async function getScreenName() {
    try {
      setScreenName(await EncryptedStorage.getItem("cameFrom"))
      //return await EncryptedStorage.getItem("cameFrom");
    } catch (error) {
        // There was an error on the native side
    }
  }

  const onSubmitButtonPress = () => {
    // API call
    // todo
    setLoading(true);
    let otpString = '';
    for(var i=0;i<otpArray.length;i++) {
      otpString += otpArray[i];
    }
    console.log('todo: Submit OTP: ' + otpString);
    let data = {mobile_number:mobileNumber,otp:otpString}

    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    
    axios({
      url    : api_config.BASE_URL+api_config.VERIFY_OTP,
      method : 'POST',
      data   : formData,
      headers: { Accept: 'application/json', 'Content-Type': 'multipart/form-data', "cache-control": "no-cache", }
    })
      .then(async (response) => {
            setLoading(false)
            console.log("response :", response.data.status);
            if(response.data.status == 200) {
              if(screenName == "ForgotPasswordScreen") {
                navigation.navigate('SetPasswordScreen')
              } else {
                await EncryptedStorage.removeItem('user_id')
                navigation.navigate('LoginScreen')
                // navigation.navigate('RegisterPlan')

              }
            } else {
              alert(response.data.message)
            }
        })
        .catch(function (error) {
            setLoading(false)
            alert(defaultMessages.en.serverNotRespondingMsg);
    })
  };

  // this event won't be fired when text changes from '' to '' i.e. backspace is pressed
  // using onOtpKeyPress for this purpose
  const onOtpChange = index => {
    return value => {
      if (isNaN(Number(value))) {
        // do nothing when a non digit is pressed
        return;
      }
      const otpArrayCopy = otpArray.concat();
      otpArrayCopy[index] = value;
      setOtpArray(otpArrayCopy);
      
      for(var i=0;i<otpArrayCopy.length;i++) {
        if(otpArrayCopy[i] == '') {
          setSubmittingOtp(true)
        } else {
          setSubmittingOtp(false)
        }
      }
      
      // auto focus to next InputText if value is not blank
      if (value !== '') {
        if (index === 0) {
          secondTextInputRef.current.focus();
        } else if (index === 1) {
          thirdTextInputRef.current.focus();
        } else if (index === 2) {
          fourthTextInputRef.current.focus();
        } else if (index === 3) {
          fifthTextInputRef.current.focus();
        } else if (index === 4) {
          sixthTextInputRef.current.focus();
        }
      }
      
    };
  };

  // only backspace key press event is fired on Android
  // to have consistency, using this event just to detect backspace key press and
  // onOtpChange for other digits press
  const onOtpKeyPress = index => {
    return ({nativeEvent: {key: value}}) => {
      // auto focus to previous InputText if value is blank and existing value is also blank
      
      if (value === 'Backspace' && otpArray[index] === '') {
        
        if (index === 1) {
          firstTextInputRef.current.focus();
        } else if (index === 2) {
          secondTextInputRef.current.focus();
        } else if (index === 3) {
          thirdTextInputRef.current.focus();
        } else if (index === 4) {
          fourthTextInputRef.current.focus();
        } else if (index === 5) {
          fifthTextInputRef.current.focus();
        } else if (index === 6) {
          sixthTextInputRef.current.focus();
        }
        
        /**
         * clear the focused text box as well only on Android because on mweb onOtpChange will be also called
         * doing this thing for us
         * todo check this behaviour on ios
         */
         
        if (isAndroid && index > 0) {
          const otpArrayCopy = otpArray.concat();
          otpArrayCopy[index - 1] = ''; // clear the previous box which will be in focus
          setOtpArray(otpArrayCopy);
        }
      } 
    };
  };

  return (
    <CustomScreenContainer>
      <Spinner
          //visibility of Overlay Loading Spinner
          visible={loading}
          color="#085cab"
        />
      <View style={{width: '100%', marginTop: 0,backgroundColor:'#F0F5F9',height:108,justifyContent:'center'}}>
          <Appbar.Header style={{backgroundColor: 'transparent'}}>
            <Appbar.BackAction
              color="#000"
              onPress={() => navigation.navigate(screenName)}
            />
            <Appbar.Content
              style={{alignItems: 'center'}}
              color="#000"
              title="Verify OTP"
              titleStyle={{fontSize: 20, fontFamily: "Poppins-SemiBold"}}
            />
            <Appbar.Action color="transparent" onPress={() => {}} />
          </Appbar.Header>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={true}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps={'always'}
          //contentContainerStyle={styles.contentContainer}
          contentContainerStyle={{flexGrow:1}}
          style={styles.scrollViewStyle}>
      <ErrorBoundary screenName={'VerifyOtpScreen'}>
        <View style={styles.container}>
        <View style={{justifyContent:'center',width:'100%',alignItems:'center',marginTop:'10%',marginBottom:50}}>
            <VerifyOtpIcon></VerifyOtpIcon>
            </View>
          <CustomText>
             We have sent verification code on your number <CustomText style={GenericStyles.bold}>{mobileNumber}</CustomText>
            {/* {otpRequestData.email_id ? 'email' : ' mobile number'}{' '} */}
          </CustomText>
          <View style={[GenericStyles.row, GenericStyles.mt12]}>
            {[
              firstTextInputRef,
              secondTextInputRef,
              thirdTextInputRef,
              fourthTextInputRef,
              fifthTextInputRef,
              sixthTextInputRef
            ].map((textInputRef, index) => (
              <CustomTextInput
                containerStyle={[GenericStyles.fill, GenericStyles.mr12]}
                value={otpArray[index]}
                onKeyPress={onOtpKeyPress(index)}
                onChangeText={onOtpChange(index)}
                keyboardType={'numeric'}
                maxLength={1}
                style={[styles.otpText, GenericStyles.centerAlignedText]}
                autoFocus={index === 0 ? true : undefined}
                refCallback={refCallback(textInputRef)}
                key={index}
              />
            ))}
          </View>
          {errorMessage ? (
            <CustomText
              style={[
                GenericStyles.negativeText,
                GenericStyles.mt12,
                GenericStyles.centerAlignedText,
              ]}>
              {errorMessage}
            </CustomText>
          ) : null}
          <FullButtonComponent
            type={'fill'}
            text={'Verify'}
            textStyle={styles.submitButtonText}
            buttonStyle={GenericStyles.mt24}
            onPress={onSubmitButtonPress}
            disabled={submittingOtp}
          />
          {resendButtonDisabledTime > 0 ? (
            <TimerText text={'Resend OTP in'} time={resendButtonDisabledTime} />
          ) : (
            <CustomButton
              type={'link'}
              text={'Resend'}
              buttonStyle={styles.otpResendButton}
              textStyle={styles.otpResendButtonText}
              onPress={onResendOtpButtonPress}
            />
          )}
          <View style={GenericStyles.fill} />
          {submittingOtp && <ActivityIndicator />}
          {autoSubmitOtpTime > 0 &&
          autoSubmitOtpTime < AUTO_SUBMIT_OTP_TIME_LIMIT ? (
            <TimerText text={'Submitting OTP in'} time={autoSubmitOtpTime} />
          ) : null}
          {/* <CustomText
            style={[GenericStyles.centerAlignedText, GenericStyles.mt12]}>
            {attemptsRemaining || 0} Attempts remaining
          </CustomText> */}
        </View>
      </ErrorBoundary>
      </ScrollView>
    </CustomScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor:colors.WHITE,
    borderRadius:20,
    padding: 16,
    paddingTop: '0%',
    flex: 1,
  },
  submitButtonText: {
    color: colors.WHITE,
    //backgroundColor:colors.GREEN,
    fontFamily:'popins',
    fontSize:18,
    alignItems: 'center',
  },
  otpResendButton: {
    alignItems: 'center',
    width: '100%',
    marginTop: 16,
  },
  otpResendButtonText: {
    color: colors.GREEN,
    textTransform: 'none',
    fontSize:18,
    fontFamily:'popins',
    textDecorationLine: 'underline',
  },
  otpText: {
    fontWeight: 'bold',
    color: colors.GREEN,
    fontSize: 18,
    width: '100%',
  },
  scrollViewStyle: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    borderBottomStartRadius:0,
  },
});

VerifyOtpScreen.defaultProps = {
  attempts: 3,
  otpRequestData: {
    username: 'varunon9',
    email_id: false,
    phone_no: true,
  },
};

VerifyOtpScreen.propTypes = {
  otpRequestData: PropTypes.object.isRequired,
  attempts: PropTypes.number.isRequired,
};

export default VerifyOtpScreen;

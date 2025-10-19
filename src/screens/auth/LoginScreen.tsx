import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TextInput,
  Button,
  Text,
  Snackbar,
  SegmentedButtons,
  useTheme,
  Card,
  RadioButton,
  ActivityIndicator,
} from 'react-native-paper';
import { useSelector } from 'react-redux';
import {
  useGetUserTypeMutation,
  useRegisterUserTypeMutation,
} from '../../api/apiSlice';
import {
  loginUser,
  createUserAccount,
  selectCurrentUser,
  selectAppwriteUserId,
  selectAppwriteJWT,
  selectIsAuthenticated,
  selectAccountType,
  selectIsNewUser,
  selectAuthInitialized,
  selectAuthLoading,
  selectAuthError,
  resetError,
  setInitialized,
} from '../../core/redux/slices/authSlice';
import { useAppDispatch, type RootState } from '../../core/redux/store';
import { useNavigation } from '@react-navigation/native';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  organizationName?: string;
  registrationNumber?: string;
  phone?: string;
}

type AccountType = 'user' | 'ngo';
type AuthMode = 'login' | 'register';

export default function LoginScreen() {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const navigation = useNavigation<any>();

  const authLoading = useSelector(selectAuthLoading);
  const authError = useSelector(selectAuthError);

  const [getUserType, { isLoading: gettingUserType, error: getUserTypeError }] =
    useGetUserTypeMutation();
  const [
    registerUserType,
    { isLoading: registeringUserType, error: registerUserTypeError },
  ] = useRegisterUserTypeMutation();

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [selectedAccountType, setSelectedAccountType] =
    useState<AccountType>('user');
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    organizationName: '',
    registrationNumber: '',
    phone: '',
  });
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  useEffect(() => {
    dispatch(resetError());
  }, [authMode, dispatch]);

  const showSnackbar = useCallback((message: string) => {
    setSnackbar({ visible: true, message });
  }, []);

  const handleInputChange = useCallback(
    (field: keyof FormData, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
    },
    [],
  );

  const isFormValid = useCallback(() => {
    if (authMode === 'login') {
      return formData.email.includes('@') && formData.password.length >= 8;
    } else {
      const baseValid =
        formData.email.includes('@') &&
        formData.password.length >= 8 &&
        formData.name.trim() !== '' &&
        formData.confirmPassword === formData.password;
      if (selectedAccountType === 'ngo') {
        return (
          baseValid &&
          formData.organizationName?.trim() !== '' &&
          formData.registrationNumber?.trim() !== '' &&
          formData.phone?.trim() !== ''
        );
      }
      return baseValid;
    }
  }, [authMode, formData, selectedAccountType]);

  const getPasswordStrength = useCallback((password: string) => {
    if (password.length === 0) return { strength: 0, label: '', color: '' };
    if (password.length < 8)
      return { strength: 1, label: 'Too Short', color: '#f44336' };
    let strength = 1;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['', '#f44336', '#ff9800', '#ffc107', '#4caf50', '#2e7d32'];
    return { strength, label: labels[strength], color: colors[strength] };
  }, []);

  const handleForgotPassword = useCallback(async () => {
    if (!resetEmail.includes('@')) {
      showSnackbar('Please enter a valid email address.');
      return;
    }
    try {
      showSnackbar('Sending verification code...');
      const appwriteService = (await import('../../appwrite/service')).default;
      const resetUrl = 'http://localhost/reset-password';
      const result = await appwriteService.createRecovery(resetEmail, resetUrl);
      if (!result.success) {
        throw new Error(result.error || 'Failed to send reset email');
      }
      showSnackbar('Password reset email sent! Check your inbox. 📧');
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error: any) {
      let errorMessage = 'Failed to send reset email. Please try again.';
      if (
        error?.message?.includes('User') &&
        error?.message?.includes('not found')
      ) {
        errorMessage = 'No account found with this email address.';
      } else {
        errorMessage = error.message;
      }
      showSnackbar(errorMessage);
    }
  }, [resetEmail, showSnackbar]);

  const handleLogin = useCallback(async () => {
    if (!isFormValid()) {
      showSnackbar('Please fill all required fields correctly.');
      return;
    }
    try {
      showSnackbar('Authenticating...');
      await dispatch(
        loginUser({
          email: formData.email,
          password: formData.password,
        }),
      ).unwrap();
      showSnackbar('Login successful! Welcome back.');
    } catch (error: any) {
      const errorMessage =
        error?.message || 'Login failed. Please check your credentials.';
      showSnackbar(errorMessage);
    }
  }, [formData, isFormValid, dispatch, showSnackbar]);

  const handleRegister = useCallback(async () => {
    if (!isFormValid()) {
      showSnackbar('Please fill all required fields correctly.');
      return;
    }
    try {
      showSnackbar('Creating your account...');
      const appwriteResult = await dispatch(
        createUserAccount({
            email: formData.email,
            password: formData.password,
            name: formData.name,
            accountType: 'user'
        }),
      ).unwrap();

      showSnackbar('Setting up your profile...');
      const backendData = {
        appwrite_user_id: appwriteResult.$id,
        email: formData.email,
        name: formData.name,
        account_type: selectedAccountType,
        ...(selectedAccountType === 'ngo' && {
          organizationName: formData.organizationName,
          registrationNumber: formData.registrationNumber,
          phone: formData.phone,
        }),
      };
      await registerUserType(backendData).unwrap();

      showSnackbar('Registration successful! Please log in.');
      setAuthMode('login');
    } catch (error: any) {
      const errorMessage =
        error?.data?.error ||
        error?.message ||
        'Registration failed. Please try again.';
      showSnackbar(errorMessage);
    }
  }, [
    formData,
    selectedAccountType,
    isFormValid,
    dispatch,
    registerUserType,
    navigation,
    showSnackbar,
  ]);

  const isLoading = authLoading || gettingUserType || registeringUserType;
  const currentError = authError || getUserTypeError || registerUserTypeError;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Karuna Nidhan</Text>
            <Text style={styles.subtitle}>
              A single touch of kindness can heal a life that never had a voice.
            </Text>
          </View>

          <Card style={styles.formCard}>
            <Card.Content>
              {isLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator
                    animating={true}
                    size="large"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.loadingText}>
                    {authLoading
                      ? 'Authenticating...'
                      : gettingUserType
                      ? 'Loading profile...'
                      : registeringUserType
                      ? 'Creating account...'
                      : 'Processing...'}
                  </Text>
                </View>
              )}

              {showForgotPassword ? (
                <>
                  <View style={styles.forgotPasswordHeader}>
                    <Text style={styles.forgotPasswordTitle}>
                      Reset Password
                    </Text>
                    <Text style={styles.forgotPasswordSubtitle}>
                      Enter your email and we'll send a reset link.
                    </Text>
                  </View>
                  <TextInput
                    label="Email Address"
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    style={styles.input}
                    mode="outlined"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    disabled={isLoading}
                    left={<TextInput.Icon icon="email" />}
                  />
                  <Button
                    mode="contained"
                    onPress={handleForgotPassword}
                    style={styles.submitButton}
                    disabled={isLoading || !resetEmail.includes('@')}
                    loading={isLoading}
                  >
                    Send Reset Email
                  </Button>
                  <Button
                    mode="text"
                    onPress={() => setShowForgotPassword(false)}
                    style={styles.backButton}
                    disabled={isLoading}
                  >
                    Back to Login
                  </Button>
                </>
              ) : (
                <>
                  <SegmentedButtons
                    value={authMode}
                    onValueChange={value =>
                      !isLoading && setAuthMode(value as AuthMode)
                    }
                    buttons={[
                      { value: 'login', label: 'Sign In' },
                      { value: 'register', label: 'Register' },
                    ]}
                    style={styles.authModeButtons}
                  />

                  {authMode === 'register' && (
                    <>
                      <View style={styles.accountTypeSection}>
                        <Text style={styles.sectionTitle}>
                          Choose Account Type:
                        </Text>
                        <Card
                          style={[
                            styles.accountTypeCard,
                            selectedAccountType === 'user' &&
                              styles.selectedCard,
                          ]}
                          onPress={() =>
                            !isLoading && setSelectedAccountType('user')
                          }
                        >
                          <Card.Content style={styles.accountTypeContent}>
                            <RadioButton.Android
                              value="user"
                              status={
                                selectedAccountType === 'user'
                                  ? 'checked'
                                  : 'unchecked'
                              }
                              onPress={() =>
                                !isLoading && setSelectedAccountType('user')
                              }
                              color={theme.colors.primary}
                            />
                            <View style={styles.accountTypeInfo}>
                              <Text style={styles.accountTypeLabel}>
                                Individual User
                              </Text>
                              <Text style={styles.accountTypeDescription}>
                                Report emergencies, track status
                              </Text>
                            </View>
                          </Card.Content>
                        </Card>
                        <Card
                          style={[
                            styles.accountTypeCard,
                            selectedAccountType === 'ngo' &&
                              styles.selectedCard,
                          ]}
                          onPress={() =>
                            !isLoading && setSelectedAccountType('ngo')
                          }
                        >
                          <Card.Content style={styles.accountTypeContent}>
                            <RadioButton.Android
                              value="ngo"
                              status={
                                selectedAccountType === 'ngo'
                                  ? 'checked'
                                  : 'unchecked'
                              }
                              onPress={() =>
                                !isLoading && setSelectedAccountType('ngo')
                              }
                              color={theme.colors.primary}
                            />
                            <View style={styles.accountTypeInfo}>
                              <Text style={styles.accountTypeLabel}>
                                NGO Organization
                              </Text>
                              <Text style={styles.accountTypeDescription}>
                                Manage rescues, coordinate volunteers
                              </Text>
                            </View>
                          </Card.Content>
                        </Card>
                      </View>
                      <TextInput
                        label="Full Name *"
                        value={formData.name}
                        onChangeText={text => handleInputChange('name', text)}
                        style={styles.input}
                        mode="outlined"
                        disabled={isLoading}
                        left={<TextInput.Icon icon="account" />}
                      />
                      {selectedAccountType === 'ngo' && (
                        <>
                          <TextInput
                            label="Organization Name *"
                            value={formData.organizationName}
                            onChangeText={text =>
                              handleInputChange('organizationName', text)
                            }
                            style={styles.input}
                            mode="outlined"
                            disabled={isLoading}
                            left={<TextInput.Icon icon="domain" />}
                          />
                          <TextInput
                            label="Registration Number *"
                            value={formData.registrationNumber}
                            onChangeText={text =>
                              handleInputChange('registrationNumber', text)
                            }
                            style={styles.input}
                            mode="outlined"
                            disabled={isLoading}
                            left={<TextInput.Icon icon="certificate" />}
                          />
                          <TextInput
                            label="Phone Number *"
                            value={formData.phone}
                            onChangeText={text =>
                              handleInputChange('phone', text)
                            }
                            style={styles.input}
                            mode="outlined"
                            keyboardType="phone-pad"
                            disabled={isLoading}
                            left={<TextInput.Icon icon="phone" />}
                          />
                        </>
                      )}
                    </>
                  )}

                  <TextInput
                    label="Email Address"
                    value={formData.email}
                    onChangeText={text => handleInputChange('email', text)}
                    style={styles.input}
                    mode="outlined"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    disabled={isLoading}
                    left={<TextInput.Icon icon="email" />}
                  />
                  <TextInput
                    label="Password"
                    value={formData.password}
                    onChangeText={text => handleInputChange('password', text)}
                    style={styles.input}
                    mode="outlined"
                    secureTextEntry={!showPassword}
                    disabled={isLoading}
                    left={<TextInput.Icon icon="lock" />}
                    right={
                      <TextInput.Icon
                        icon={showPassword ? 'eye-off' : 'eye'}
                        onPress={() => setShowPassword(!showPassword)}
                      />
                    }
                  />

                  {authMode === 'register' && formData.password.length > 0 && (
                    <View style={styles.passwordStrengthContainer}>
                      <View style={styles.passwordStrengthBar}>
                        <View
                          style={[
                            styles.passwordStrengthFill,
                            {
                              width: `${
                                (getPasswordStrength(formData.password)
                                  .strength /
                                  5) *
                                100
                              }%`,
                              backgroundColor: getPasswordStrength(
                                formData.password,
                              ).color,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.passwordStrengthLabel,
                          {
                            color: getPasswordStrength(formData.password).color,
                          },
                        ]}
                      >
                        {getPasswordStrength(formData.password).label}
                      </Text>
                    </View>
                  )}
                  {authMode === 'register' && (
                    <>
                      <TextInput
                        label="Confirm Password *"
                        value={formData.confirmPassword}
                        onChangeText={text =>
                          handleInputChange('confirmPassword', text)
                        }
                        style={styles.input}
                        mode="outlined"
                        secureTextEntry={!showConfirmPassword}
                        disabled={isLoading}
                        left={<TextInput.Icon icon="lock-check" />}
                        right={
                          <TextInput.Icon
                            icon={showConfirmPassword ? 'eye-off' : 'eye'}
                            onPress={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                          />
                        }
                        error={
                          formData.confirmPassword !== '' &&
                          formData.password !== formData.confirmPassword
                        }
                      />
                      {formData.confirmPassword.length > 0 && (
                        <View style={styles.passwordMatchContainer}>
                          {formData.password === formData.confirmPassword ? (
                            <Text style={styles.passwordMatchSuccess}>
                              ✓ Passwords match
                            </Text>
                          ) : (
                            <Text style={styles.passwordMatchError}>
                              ✗ Passwords don't match
                            </Text>
                          )}
                        </View>
                      )}
                    </>
                  )}
                  {authMode === 'login' && (
                    <Button
                      mode="text"
                      onPress={() => setShowForgotPassword(true)}
                      style={styles.forgotPasswordButton}
                      disabled={isLoading}
                      compact
                    >
                      Forgot Password?
                    </Button>
                  )}

                  <Button
                    mode="contained"
                    onPress={
                      authMode === 'login' ? handleLogin : handleRegister
                    }
                    style={styles.submitButton}
                    disabled={isLoading || !isFormValid()}
                    loading={isLoading}
                  >
                    {authMode === 'login'
                      ? 'Sign In'
                      : `Create ${
                          selectedAccountType === 'ngo' ? 'NGO' : 'User'
                        } Account`}
                  </Button>
                </>
              )}
            </Card.Content>
          </Card>

          <View style={styles.quoteContainer}>
            <Text style={styles.quoteText}>
              "The greatness of a nation can be judged by the way its animals
              are treated."
            </Text>
            <Text style={styles.authorText}>— Mahatma Gandhi</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
        duration={4000}
        action={{
          label: 'Close',
          onPress: () => setSnackbar({ visible: false, message: '' }),
        }}
        style={styles.snackbar}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

const { height } = Dimensions.get('window');

// Paste your complete original styles object here
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fce9d3ff' },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: height * 0.08,
    paddingBottom: 40,
  },
  titleContainer: { alignItems: 'center', marginBottom: 32 },
  title: {
    fontSize: 88,
    lineHeight: 84,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Samarkan',
    color: '#8B4513',
    textShadowColor: 'rgba(255, 129, 39, 0.9)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#b87a3cff',
    fontWeight: '600',
    letterSpacing: 2,
    paddingHorizontal: 10,
  },
  formCard: {
    borderRadius: 16,
    backgroundColor: '#fce9d3ff',
    marginBottom: 20,
    elevation: 2,
    shadowColor: 'rgba(139, 69, 19, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8B4513',
    fontWeight: '500',
  },
  authModeButtons: { marginBottom: 20 },
  accountTypeSection: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#8B4513',
  },
  accountTypeCard: {
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    backgroundColor: '#FFF8DC',
  },
  selectedCard: {
    backgroundColor: '#F0E68C',
    borderWidth: 2,
    borderColor: '#8B4513',
  },
  accountTypeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  accountTypeInfo: { flex: 1, marginLeft: 12 },
  accountTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 4,
  },
  accountTypeDescription: { fontSize: 13, color: '#654321', lineHeight: 18 },
  input: { marginVertical: 6, backgroundColor: 'rgba(255, 255, 255, 0.9)' },
  errorCard: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
    marginVertical: 12,
  },
  errorText: { color: '#c62828', fontSize: 14, fontWeight: '500' },
  submitButton: { marginTop: 24, marginBottom: 16, borderRadius: 12 },
  submitButtonContent: { paddingVertical: 8 },
  infoCard: {
    marginTop: 16,
    backgroundColor: '#e8f5e8',
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2e7d32',
  },
  infoText: { fontSize: 13, color: '#388e3c', lineHeight: 20 },
  requirementsCard: {
    marginTop: 12,
    backgroundColor: '#fff3e0',
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#f57c00',
  },
  requirementsText: { fontSize: 13, color: '#ef6c00', lineHeight: 20 },
  quoteContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  quoteText: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 8,
    color: '#8B4513',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
    lineHeight: 20,
  },
  authorText: {
    textAlign: 'center',
    color: '#654321',
    fontSize: 12,
    fontWeight: '600',
  },
  snackbar: { marginBottom: 20 },
  forgotPasswordHeader: { marginBottom: 24 },
  forgotPasswordTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B4513',
    marginBottom: 8,
    textAlign: 'center',
  },
  forgotPasswordSubtitle: {
    fontSize: 14,
    color: '#654321',
    textAlign: 'center',
    lineHeight: 20,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 8,
  },
  backButton: { marginTop: 8 },
  passwordStrengthContainer: { marginTop: 8, marginBottom: 12 },
  passwordStrengthBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  passwordStrengthFill: { height: '100%', borderRadius: 3 },
  passwordStrengthLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  passwordMatchContainer: { marginTop: 4, marginBottom: 8 },
  passwordMatchSuccess: { fontSize: 12, color: '#4caf50', fontWeight: '500' },
  passwordMatchError: { fontSize: 12, color: '#f44336', fontWeight: '500' },
});

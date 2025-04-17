import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Camera, Save, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import axios from 'axios';

const ProfileSettings = () => {
    const { user, updateUserInfo } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [profileData, setProfileData] = useState({
        email: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [previewImage, setPreviewImage] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);

    useEffect(() => {
        if (user) {
            setProfileData(prev => ({
                ...prev,
                email: user.email || ''
            }));
            if (user.profileImageUrl) {
                setPreviewImage(user.profileImageUrl);
            }
        }
    }, [user]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadProfileImage = async () => {
        if (!selectedFile || !user) return;

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            setLoading(true);
            const response = await axios.post('/api/profile/image', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': user.token // Используем токен из объекта user
                }
            });

            setMessage({ type: 'success', text: 'Изображение профиля успешно обновлено' });
            updateUserInfo({ profileImageUrl: response.data.imagePath });
            setSelectedFile(null);
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Ошибка при загрузке изображения' });
        } finally {
            setLoading(false);
        }
    };

    const updateProfileInfo = async () => {
        if (!user) {
            setMessage({ type: 'error', text: 'Вы не авторизованы' });
            return;
        }

        try {
            setLoading(true);

            // If new image is selected, upload it first
            if (selectedFile) {
                await uploadProfileImage();
            }

            // Update profile info
            const response = await axios.put('/api/profile', profileData, {
                headers: {
                    'Authorization': user.token // Используем токен из объекта user
                }
            });

            setMessage({ type: 'success', text: 'Профиль успешно обновлен' });

            // Update user context with new email
            updateUserInfo({ email: profileData.email });

            // Clear password fields
            setProfileData(prev => ({
                ...prev,
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            }));
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Ошибка при обновлении профиля' });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate passwords if trying to change password
        if (profileData.newPassword || profileData.confirmPassword || profileData.currentPassword) {
            if (!profileData.currentPassword) {
                setMessage({ type: 'error', text: 'Введите текущий пароль' });
                return;
            }
            if (profileData.newPassword !== profileData.confirmPassword) {
                setMessage({ type: 'error', text: 'Новый пароль и подтверждение не совпадают' });
                return;
            }
            if (profileData.newPassword.length < 6) {
                setMessage({ type: 'error', text: 'Новый пароль должен содержать минимум 6 символов' });
                return;
            }
        }

        updateProfileInfo();
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Настройки профиля</h2>
                        <p className="card-description">Обновите свои персональные данные и пароль</p>
                    </div>
                    <div className="card-content">
                        {message.text && (
                            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                                message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                                {message.type === 'error' ?
                                    <AlertCircle className="w-5 h-5" /> :
                                    <Check className="w-5 h-5" />
                                }
                                {message.text}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="mb-6 flex flex-col items-center">
                                <div className="relative w-24 h-24 mb-4">
                                    {previewImage ? (
                                        <img
                                            src={previewImage}
                                            alt="Profile"
                                            className="w-full h-full rounded-full object-cover border-2 border-gray-200"
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center">
                                            <Camera size={32} className="text-gray-400" />
                                        </div>
                                    )}

                                    <label htmlFor="profile-image" className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-2 cursor-pointer hover:bg-blue-600 transition-colors">
                                        <Camera size={16} className="text-white" />
                                    </label>
                                    <input
                                        type="file"
                                        id="profile-image"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </div>
                                <p className="text-sm text-gray-500 mb-2">Загрузите фото профиля</p>
                                {selectedFile && (
                                    <p className="text-xs text-blue-500">{selectedFile.name}</p>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={profileData.email}
                                    onChange={handleInputChange}
                                    placeholder="Ваш email"
                                    className="w-full"
                                />
                            </div>

                            <div className="mt-8 mb-4">
                                <h3 className="text-lg font-medium">Изменить пароль</h3>
                                <p className="text-sm text-gray-500">Оставьте поля пустыми, если не хотите менять пароль</p>
                            </div>

                            <div className="form-group">
                                <label htmlFor="currentPassword">Текущий пароль</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="currentPassword"
                                        name="currentPassword"
                                        value={profileData.currentPassword}
                                        onChange={handleInputChange}
                                        className="w-full pr-10"
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 bg-transparent p-1 hover:text-gray-700"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="newPassword">Новый пароль</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="newPassword"
                                        name="newPassword"
                                        value={profileData.newPassword}
                                        onChange={handleInputChange}
                                        className="w-full pr-10"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirmPassword">Подтверждение пароля</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        value={profileData.confirmPassword}
                                        onChange={handleInputChange}
                                        className="w-full pr-10"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg disabled:opacity-50"
                                    disabled={loading}
                                >
                                    {loading ? 'Сохранение...' : (
                                        <>
                                            <Save size={18} />
                                            Сохранить изменения
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
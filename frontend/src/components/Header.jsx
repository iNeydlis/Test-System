import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { UserCircle, ChevronDown, LogOut, Settings, User } from 'lucide-react';

const Header = () => {
    const { user, logout, getAuthenticatedImageUrl } = useContext(AuthContext);
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [profileImage, setProfileImage] = useState(null);
    const dropdownRef = useRef(null);

    const handleLogout = async () => {
        setDropdownOpen(false); // Закрываем меню перед выходом
        await logout();
        navigate('/login');
    };

    const navigateToHome = () => {
        navigate('/');
    };

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    // Обработчик клика вне компонента
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        }

        // Добавляем обработчик события
        document.addEventListener('mousedown', handleClickOutside);

        // Очищаем обработчик события при размонтировании
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (user && user.profileImageUrl) {
            let isMounted = true;

            const loadImage = async () => {
                const imageUrl = await getAuthenticatedImageUrl(user.profileImageUrl);
                if (isMounted && imageUrl) {
                    setProfileImage(imageUrl);
                }
            };

            loadImage();

            return () => {
                isMounted = false;
                // Очищаем URL объекты
                if (profileImage) {
                    URL.revokeObjectURL(profileImage);
                }
            };
        } else {
            // Сбрасываем состояние при отсутствии пользователя
            setProfileImage(null);
            setDropdownOpen(false);
        }
    }, [user, getAuthenticatedImageUrl]);

    return (
        <header className="bg-gradient-blue text-white py-4 shadow-md">
            <div className="container mx-auto px-4 flex justify-between items-center">
                <h1
                    className="text-xl font-bold cursor-pointer hover:text-white/80 transition-colors"
                    onClick={navigateToHome}
                >
                    Школьная система тестирования
                </h1>
                {user ? (
                    <div className="relative flex items-center gap-4" ref={dropdownRef}>
                        <div
                            className="flex items-center gap-2 cursor-pointer hover:bg-white/10 py-1 px-2 rounded-lg transition-colors"
                            onClick={toggleDropdown}
                        >
                            {user.profileImageUrl && profileImage ? (
                                <img
                                    src={profileImage}
                                    alt={user.fullName}
                                    className="w-8 h-8 rounded-full object-cover border-2 border-white/50"
                                />
                            ) : (
                                <UserCircle className="w-8 h-8" />
                            )}
                            <span className="hidden md:inline-block">{user.fullName}</span>
                            <span className="hidden md:inline-block text-sm bg-white/20 px-2 py-0.5 rounded-full">
                                {user.role === 'ADMIN' ? 'Администратор' :
                                    user.role === 'TEACHER' ? 'Учитель' : 'Ученик'}
                            </span>
                            <ChevronDown className="w-4 h-4" />
                        </div>

                        {dropdownOpen && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white shadow-lg rounded-lg z-10 text-gray-800 overflow-hidden">
                                <div className="p-3 border-b border-gray-200">
                                    <p className="font-medium">{user.fullName}</p>
                                    <p className="text-sm text-gray-500">{user.email || 'Нет email'}</p>
                                </div>
                                <Link
                                    to="/profile"
                                    className="flex items-center gap-2 p-3 hover:bg-gray-100 transition-colors"
                                    onClick={() => setDropdownOpen(false)} // Закрываем меню при переходе
                                >
                                    <User className="w-4 h-4" />
                                    <span>Мой профиль</span>
                                </Link>
                                <Link
                                    to="/profile/settings"
                                    className="flex items-center gap-2 p-3 hover:bg-gray-100 transition-colors"
                                    onClick={() => setDropdownOpen(false)} // Закрываем меню при переходе
                                >
                                    <Settings className="w-4 h-4" />
                                    <span>Настройки профиля</span>
                                </Link>
                                {user.role === 'ADMIN' && (
                                    <Link
                                        to="/admin"
                                        className="flex items-center gap-2 p-3 hover:bg-gray-100 transition-colors"
                                        onClick={() => setDropdownOpen(false)} // Закрываем меню при переходе
                                    >
                                        <Settings className="w-4 h-4" />
                                        <span>Админ панель</span>
                                    </Link>
                                )}
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 p-3 w-full text-left text-red-600 hover:bg-gray-100 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Выйти</span>
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <Link to="/login" className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors">
                        Войти
                    </Link>
                )}
            </div>
        </header>
    );
};

export default Header;
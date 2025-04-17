import React, {useContext, useEffect, useState} from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { User, Mail, BookOpen, School, Calendar, Settings } from 'lucide-react';

const ProfileView = () => {
    const { user, getAuthenticatedImageUrl } = useContext(AuthContext);
    const [profileImage, setProfileImage] = useState(null);

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
        }
    }, [user, getAuthenticatedImageUrl]);
    if (!user) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto">
                    <div className="card">
                        <div className="card-content">
                            <p className="text-center">Загрузка профиля...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    console.log(user.profileImageUrl);
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
                <div className="card">
                    <div className="bg-gradient-blue text-white p-8 relative">
                        <div className="absolute top-4 right-4">
                            <Link
                                to="/profile/settings"
                                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm transition-colors"
                            >
                                <Settings size={16} />
                                Редактировать
                            </Link>
                        </div>
                        <div className="flex flex-col md:flex-row gap-6 items-center">
                            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white/30">
                                {profileImage ? (
                                    <img
                                        src={profileImage}
                                        alt={user.fullName}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-white/20 flex items-center justify-center">
                                        <User size={40} />
                                    </div>
                                )}
                            </div>
                            <div className="text-center md:text-left">
                                <h1 className="text-2xl font-bold">{user.fullName}</h1>
                                <p className="text-white/80">@{user.username}</p>
                                <div className="mt-2 inline-block bg-white/20 px-3 py-1 rounded-full text-sm">
                                    {user.role === 'ADMIN' ? 'Администратор' :
                                        user.role === 'TEACHER' ? 'Учитель' : 'Ученик'}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                                <div className="bg-blue-100 p-2 rounded-full">
                                    <User className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Полное имя</p>
                                    <p className="font-medium">{user.fullName}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                                <div className="bg-blue-100 p-2 rounded-full">
                                    <Mail className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Email</p>
                                    <p className="font-medium">{user.email || 'Не указан'}</p>
                                </div>
                            </div>

                            {user.role === 'STUDENT' && user.gradeName && (
                                <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                                    <div className="bg-blue-100 p-2 rounded-full">
                                        <School className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Класс</p>
                                        <p className="font-medium">{user.gradeName}</p>
                                    </div>
                                </div>
                            )}

                            {user.role === 'TEACHER' && user.subjectNames && user.subjectNames.length > 0 && (
                                <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                                    <div className="bg-blue-100 p-2 rounded-full">
                                        <BookOpen className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Предметы</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {Array.from(user.subjectNames).map((subject, idx) => (
                                                <span key={idx} className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-full">
                                                    {subject}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {user.role === 'TEACHER' && user.teachingGradeNames && user.teachingGradeNames.length > 0 && (
                                <div className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg md:col-span-2">
                                    <div className="bg-blue-100 p-2 rounded-full">
                                        <School className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Преподает в классах</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {user.teachingGradeNames.map((grade, idx) => (
                                                <span key={idx} className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-full">
                                                    {grade}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileView;
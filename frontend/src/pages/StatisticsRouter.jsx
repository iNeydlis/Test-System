import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

const StatisticsPage = () => {
    const { user } = useContext(AuthContext);

    // Проверка, авторизован ли пользователь
    if (!user) {
        return <Navigate to="/login" />;
    }

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h2 style={titleStyle}>Статистика</h2>
                <p style={subtitleStyle}>Выберите раздел статистики</p>
            </div>

            <div style={menuContainerStyle}>
                <h3 style={menuTitleStyle}>Доступные разделы</h3>
                <div style={menuGridStyle}>
                    {user.role === 'STUDENT' && (
                        <Link to="/student-statistics" style={menuItemStyle}>
                            <div style={menuIconStyle}>📊</div>
                            <div>Моя успеваемость</div>
                        </Link>
                    )}

                    {(user.role === 'TEACHER' || user.role === 'ADMIN') && (
                        <>
                            <Link to="/teacher-admin-statistics" style={menuItemStyle}>
                                <div style={menuIconStyle}>📈</div>
                                <div>Успеваемость учеников</div>
                            </Link>

                            <Link to="/teacher-admin-statistics?view=subject" style={menuItemStyle}>
                                <div style={menuIconStyle}>📚</div>
                                <div>Статистика по предметам</div>
                            </Link>

                            <Link to="/teacher-admin-statistics?view=grade" style={menuItemStyle}>
                                <div style={menuIconStyle}>🏫</div>
                                <div>Статистика по классам</div>
                            </Link>

                            <Link to="/teacher-admin-statistics?view=test" style={menuItemStyle}>
                                <div style={menuIconStyle}>✅</div>
                                <div>Результаты тестов</div>
                            </Link>
                        </>
                    )}

                    <Link to="/" style={menuItemStyle}>
                        <div style={menuIconStyle}>🏠</div>
                        <div>Вернуться на главную</div>
                    </Link>
                </div>
            </div>
        </div>
    );
};

// Стили
const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    padding: '2rem'
};

const headerStyle = {
    backgroundColor: '#3b82f6',
    padding: '2rem',
    borderRadius: '8px',
    color: 'white'
};

const titleStyle = {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem'
};

const subtitleStyle = {
    opacity: '0.8'
};

const menuContainerStyle = {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 0 10px rgba(0,0,0,0.1)'
};

const menuTitleStyle = {
    marginBottom: '1.5rem'
};

const menuGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1rem'
};

const menuItemStyle = {
    backgroundColor: '#f5f7fa',
    padding: '1.5rem',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textDecoration: 'none',
    color: '#333',
    transition: 'transform 0.3s ease-in-out',
    textAlign: 'center',
    cursor: 'pointer'
};

const menuIconStyle = {
    fontSize: '2rem',
    marginBottom: '0.5rem'
};

export default StatisticsPage;
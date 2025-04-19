import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const { user } = useContext(AuthContext);

    return (
        <div style={dashboardContainerStyle}>
            <MainMenu user={user} />
            <UserInfo user={user} />
        </div>
    );
};

const MainMenu = ({ user }) => {
    return (
        <div style={menuContainerStyle}>
            <h3 style={menuTitleStyle}>Меню тестов</h3>
            <div style={menuGridStyle}>
                <Link to="/tests" style={menuItemStyle}>
                    <div style={menuIconStyle}>📋</div>
                    <div>Список всех тестов</div>
                </Link>
                {user.role === 'STUDENT' && (
                    <Link to="/statistics" style={menuItemStyle}>
                        <div style={menuIconStyle}>📊</div>
                        <div>Мои результаты</div>
                    </Link>
                )}
                {(user.role === 'TEACHER' || user.role === 'ADMIN') && (
                    <>
                        <Link to="/tests/create" style={menuItemStyle}>
                            <div style={menuIconStyle}>✏️</div>
                            <div>Создать тест</div>
                        </Link>
                        <Link to="/statistics" style={menuItemStyle}>
                            <div style={menuIconStyle}>📊</div>
                            <div>Статистика</div>
                        </Link>
                    </>
                )}
                {user.role === 'ADMIN' && (
                    <Link to="/admin" style={menuItemStyle}>
                        <div style={menuIconStyle}>⚙️</div>
                        <div>Панель администратора</div>
                    </Link>
                )}
            </div>
        </div>
    );
};

const UserInfo = ({ user }) => {
    const subjectsDisplay = user.subjectNames ? user.subjectNames.join(', ') : 'Не указаны';

    return (
        <div style={userInfoContainerStyle}>
            <h3 style={userInfoTitleStyle}>Информация о пользователе</h3>
            <div style={userInfoGridStyle}>
                <div><strong>Имя пользователя:</strong></div>
                <div>{user.username}</div>
                <div><strong>Полное имя:</strong></div>
                <div>{user.fullName}</div>
                <div><strong>Email:</strong></div>
                <div>{user.email}</div>
                <div><strong>Роль:</strong></div>
                <div>{user.role}</div>
                {user.role === 'TEACHER' && (
                    <>
                        <div><strong>Предметы:</strong></div>
                        <div>{subjectsDisplay}</div>
                    </>
                )}
                {user.role === 'STUDENT' && (
                    <>
                        <div><strong>Класс:</strong></div>
                        <div>{user.gradeName}</div>
                    </>
                )}
            </div>
        </div>
    );
};

// Стили
const dashboardContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    padding: '2rem'
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
};

const menuIconStyle = {
    fontSize: '2rem',
    marginBottom: '0.5rem'
};

const userInfoContainerStyle = {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 0 10px rgba(0,0,0,0.1)'
};

const userInfoTitleStyle = {
    marginBottom: '1.5rem'
};

const userInfoGridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: '1rem'
};

export default Dashboard;
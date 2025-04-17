import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import UserForm from '../components/UserForm';

const AdminPanel = () => {
    const { user } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [grades, setGrades] = useState([]);
    const [subjects, setSubjects] = useState([]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `${user.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Ошибка загрузки пользователей');
            }

            const data = await response.json();
            setUsers(data);
        } catch (err) {
            setError(err.message || 'Ошибка загрузки данных');
        } finally {
            setLoading(false);
        }
    };

    const fetchGradesAndSubjects = async () => {
        try {
            // Загрузка списка классов
            const gradesResponse = await fetch('/api/grades', {
                headers: {
                    'Authorization': `${user.token}`
                }
            });

            if (!gradesResponse.ok) {
                throw new Error('Ошибка загрузки классов');
            }

            const gradesData = await gradesResponse.json();
            setGrades(gradesData);

            // Загрузка списка предметов
            const subjectsResponse = await fetch('/api/subjects', {
                headers: {
                    'Authorization': `${user.token}`
                }
            });

            if (!subjectsResponse.ok) {
                throw new Error('Ошибка загрузки предметов');
            }

            const subjectsData = await subjectsResponse.json();
            setSubjects(subjectsData);
        } catch (err) {
            setError(err.message || 'Ошибка загрузки справочных данных');
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchGradesAndSubjects();
    }, [user.token]);

    const handleCreateUser = () => {
        setEditingUser(null);
        setShowForm(true);
    };

    const handleEditUser = (userData) => {
        // Создаем объект только с теми полями, которые есть в UserDto
        const userDtoData = {
            id: userData.id,
            username: userData.username,
            fullName: userData.fullName,
            email: userData.email,
            role: userData.role,
            gradeName: userData.grade ? userData.grade.fullName : null,
            subjectNames: userData.subjects ? userData.subjects.map(s => s.name) : [],
            teachingGradeNames: userData.teachingGrades ? userData.teachingGrades.map(g => g.fullName) : [], // Добавьте эту строку
            active: userData.active
        };

        setEditingUser(userDtoData);
        setShowForm(true);
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': user.token
                }
            });

            if (!response.ok) {
                throw new Error('Ошибка удаления пользователя');
            }

            // Обновляем список пользователей
            setUsers(users.filter(u => u.id !== id));
        } catch (err) {
            setError(err.message || 'Ошибка удаления пользователя');
        }
    };

    const handleFormSubmit = async (formData) => {
        try {
            // Создаем объект с только теми полями, которые принимает UserDto на бэкенде
            const userDto = {
                fullName: formData.fullName,
                email: formData.email,
                role: formData.role,
                gradeName: formData.gradeName || null,
                subjectNames: formData.subjectNames || [],
                teachingGradeNames: formData.teachingGradeNames || [], // Добавьте эту строку
                active: formData.active
            };

            // Добавляем имя пользователя только при создании нового пользователя
            if (!editingUser) {
                userDto.username = formData.username;
            }

            // Добавляем пароль только если он был введен
            if (formData.password && formData.password.trim() !== '') {
                userDto.password = formData.password;
            }

            const method = editingUser ? 'PUT' : 'POST';
            const url = editingUser
                ? `/api/admin/users/${editingUser.id}`
                : '/api/admin/users';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': user.token
                },
                body: JSON.stringify(userDto)
            });

            if (!response.ok) {
                throw new Error('Ошибка сохранения пользователя');
            }

            // Обновляем список пользователей
            fetchUsers();
            setShowForm(false);
        } catch (err) {
            setError(err.message || 'Ошибка сохранения пользователя');
        }
    };

    if (loading && users.length === 0) {
        return <p>Загрузка...</p>;
    }

    return (
        <div>
            <h2>Панель администратора</h2>

            {error && (
                <div style={{
                    backgroundColor: '#f8d7da',
                    color: '#721c24',
                    padding: '0.75rem',
                    borderRadius: '4px',
                    margin: '1rem 0'
                }}>
                    {error}
                </div>
            )}

            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Управление пользователями</h3>
                <button onClick={handleCreateUser}>Добавить пользователя</button>
            </div>

            {showForm && (
                <UserForm
                    user={editingUser}
                    grades={grades}
                    subjects={subjects}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setShowForm(false)}
                />
            )}

            <table>
                <thead>
                <tr>
                    <th>ID</th>
                    <th>Имя пользователя</th>
                    <th>Полное имя</th>
                    <th>Email</th>
                    <th>Роль</th>
                    <th>Класс/Предметы</th>
                    <th>Статус</th>
                    <th>Действия</th>
                </tr>
                </thead>
                <tbody>
                {users.map(u => (
                    <tr key={u.id}>
                        <td>{u.id}</td>
                        <td>{u.username}</td>
                        <td>{u.fullName}</td>
                        <td>{u.email}</td>
                        <td>{u.role}</td>
                        <td>
                            {u.role === 'STUDENT' && u.grade ? u.grade.fullName : null}
                            {u.role === 'TEACHER' && u.subjects ?
                                u.subjects.map(s => s.name).join(', ') : null}
                        </td>
                        <td>{u.active ? 'Активен' : 'Неактивен'}</td>
                        <td style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                className="secondary"
                                onClick={() => handleEditUser(u)}
                                style={{ padding: '0.25rem 0.5rem' }}
                            >
                                Редактировать
                            </button>
                            <button
                                className="danger"
                                onClick={() => handleDeleteUser(u.id)}
                                style={{ padding: '0.25rem 0.5rem' }}
                                disabled={u.id === user.id}
                            >
                                Удалить
                            </button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminPanel;
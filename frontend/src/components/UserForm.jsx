import React, { useState, useEffect } from 'react';

const UserForm = ({ user, grades, subjects, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        fullName: '',
        email: '',
        role: 'STUDENT',
        gradeName: '',
        subjectNames: [],
        teachingGradeNames: [],
        active: true
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (user) {
            // Для ученика: gradeName - строка с именем класса
            const gradeName = user.gradeName || (user.grade ? user.grade.fullName : '');

            // Для учителя: массивы имен предметов и классов
            let subjectNames = [];
            if (user.subjectNames && user.subjectNames.length > 0) {
                subjectNames = [...user.subjectNames];
            } else if (user.subjects && user.subjects.length > 0) {
                subjectNames = user.subjects.map(subject => subject.name);
            }

            let teachingGradeNames = [];
            if (user.teachingGradeNames && user.teachingGradeNames.length > 0) {
                teachingGradeNames = [...user.teachingGradeNames];
            } else if (user.teachingGrades && user.teachingGrades.length > 0) {
                teachingGradeNames = user.teachingGrades.map(grade => grade.fullName);
            }

            setFormData({
                id: user.id,
                username: user.username || '',
                password: '', // Пароль не передаем для редактирования
                fullName: user.fullName || '',
                email: user.email || '',
                role: user.role || 'STUDENT',
                gradeName: gradeName,
                subjectNames: subjectNames,
                teachingGradeNames: teachingGradeNames,
                active: user.active !== undefined ? user.active : true
            });
        }
    }, [user]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.fullName) newErrors.fullName = 'Обязательное поле';
        if (!formData.email) newErrors.email = 'Обязательное поле';

        // Проверяем логин и пароль только при создании нового пользователя
        if (!user) {
            if (!formData.username) newErrors.username = 'Обязательное поле';
            if (!formData.password) newErrors.password = 'Обязательное поле';
        }

        // Проверяем выбор класса для ученика
        if (formData.role === 'STUDENT' && !formData.gradeName) {
            newErrors.gradeName = 'Класс обязателен для ученика';
        }

        // Проверяем выбор предметов для учителя
        if (formData.role === 'TEACHER' && (!formData.subjectNames || formData.subjectNames.length === 0)) {
            newErrors.subjectNames = 'Выберите хотя бы один предмет для учителя';
        }

        // Проверяем выбор классов для учителя
        if (formData.role === 'TEACHER' && (!formData.teachingGradeNames || formData.teachingGradeNames.length === 0)) {
            newErrors.teachingGradeNames = 'Выберите хотя бы один класс для учителя';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (type === 'checkbox') {
            setFormData({ ...formData, [name]: checked });
        } else {
            setFormData({ ...formData, [name]: value });
        }

        // При смене роли, сбрасываем связанные поля
        if (name === 'role') {
            if (value === 'STUDENT') {
                setFormData(prev => ({ ...prev, role: value, subjectNames: [], teachingGradeNames: [] }));
            } else if (value === 'TEACHER') {
                setFormData(prev => ({ ...prev, role: value, gradeName: '' }));
            } else {
                setFormData(prev => ({ ...prev, role: value, gradeName: '', subjectNames: [], teachingGradeNames: [] }));
            }
        }
    };

    const handleSubjectChange = (e) => {
        const subjectName = e.target.value;
        const isChecked = e.target.checked;

        setFormData(prev => {
            const newSubjects = isChecked
                ? [...prev.subjectNames, subjectName]
                : prev.subjectNames.filter(name => name !== subjectName);

            return { ...prev, subjectNames: newSubjects };
        });
    };

    const handleGradeChange = (e) => {
        const gradeName = e.target.value;
        const isChecked = e.target.checked;

        setFormData(prev => {
            // Важно: создаем новый массив, не изменяя существующий
            const updatedGrades = isChecked
                ? [...prev.teachingGradeNames, gradeName]
                : prev.teachingGradeNames.filter(name => name !== gradeName);

            return { ...prev, teachingGradeNames: updatedGrades };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            // Убедимся, что teachingGradeNames - это массив строк
            const submitData = {
                id: user ? user.id : undefined,
                ...formData,
                teachingGradeNames: Array.isArray(formData.teachingGradeNames)
                    ? [...formData.teachingGradeNames]
                    : []
            };

            onSubmit(submitData);
        }
    };

    return (
        <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 0 10px rgba(0,0,0,0.1)',
            marginBottom: '1.5rem'
        }}>
            <h3>{user ? 'Редактировать пользователя' : 'Добавить пользователя'}</h3>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="username">Имя пользователя</label>
                    <input
                        id="username"
                        name="username"
                        type="text"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        disabled={!!user} // Запрещаем изменение имени пользователя при редактировании
                    />
                    {errors.username && <div style={{ color: 'red' }}>{errors.username}</div>}
                </div>

                <div className="form-group">
                    <label htmlFor="password">Пароль {user && '(оставьте пустым, чтобы не менять)'}</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        required={!user}
                    />
                    {errors.password && <div style={{ color: 'red' }}>{errors.password}</div>}
                </div>

                <div className="form-group">
                    <label htmlFor="fullName">Полное имя</label>
                    <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                    />
                    {errors.fullName && <div style={{ color: 'red' }}>{errors.fullName}</div>}
                </div>

                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                    {errors.email && <div style={{ color: 'red' }}>{errors.email}</div>}
                </div>

                <div className="form-group">
                    <label htmlFor="role">Роль</label>
                    <select
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        required
                    >
                        <option value="ADMIN">Администратор</option>
                        <option value="TEACHER">Учитель</option>
                        <option value="STUDENT">Ученик</option>
                    </select>
                </div>

                {formData.role === 'STUDENT' && (
                    <div className="form-group">
                        <label htmlFor="gradeName">Класс</label>
                        <select
                            id="gradeName"
                            name="gradeName"
                            value={formData.gradeName || ''}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Выберите класс</option>
                            {grades && grades.map(grade => (
                                <option key={grade.id} value={grade.fullName}>
                                    {grade.fullName}
                                </option>
                            ))}
                        </select>
                        {errors.gradeName && <div style={{ color: 'red' }}>{errors.gradeName}</div>}
                    </div>
                )}

                {formData.role === 'TEACHER' && (
                    <>
                        <div className="form-group">
                            <label>Предметы</label>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                gap: '0.5rem',
                                marginTop: '0.5rem'
                            }}>
                                {subjects && subjects.map(subject => (
                                    <div key={subject.id} style={{ display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="checkbox"
                                            id={`subject-${subject.id}`}
                                            value={subject.name}
                                            checked={formData.subjectNames.includes(subject.name)}
                                            onChange={handleSubjectChange}
                                            style={{ marginRight: '0.5rem' }}
                                        />
                                        <label htmlFor={`subject-${subject.id}`}>{subject.name}</label>
                                    </div>
                                ))}
                            </div>
                            {errors.subjectNames && <div style={{ color: 'red' }}>{errors.subjectNames}</div>}
                        </div>

                        <div className="form-group">
                            <label>Преподаваемые классы</label>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                gap: '0.5rem',
                                marginTop: '0.5rem'
                            }}>
                                {grades && grades.map(grade => (
                                    <div key={grade.id} style={{ display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="checkbox"
                                            id={`grade-${grade.id}`}
                                            value={grade.fullName}
                                            checked={formData.teachingGradeNames.includes(grade.fullName)}
                                            onChange={handleGradeChange}
                                            style={{ marginRight: '0.5rem' }}
                                        />
                                        <label htmlFor={`grade-${grade.id}`}>{grade.fullName}</label>
                                    </div>
                                ))}
                            </div>
                            {errors.teachingGradeNames && <div style={{ color: 'red' }}>{errors.teachingGradeNames}</div>}
                        </div>
                    </>
                )}

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                        id="active"
                        name="active"
                        type="checkbox"
                        checked={formData.active}
                        onChange={handleChange}
                        style={{ width: 'auto', margin: 0 }}
                    />
                    <label htmlFor="active" style={{ margin: 0 }}>Активен</label>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button type="button" className="secondary" onClick={onCancel}>
                        Отмена
                    </button>
                    <button type="submit">
                        {user ? 'Сохранить' : 'Добавить'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default UserForm;
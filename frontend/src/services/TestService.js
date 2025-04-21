import api from './api';

class TestService {
    // Test management methods
    getAllTests() {
        return api.get(`/tests`);
    }

    getTestById(testId, includeAnswers = false) {
        return api.get(`/tests/${testId}?includeAnswers=${includeAnswers}`);
    }

    getTestQuestions(testId, testResultId) {
        return api.get(`/tests/${testId}/questions?testResultId=${testResultId}`);
    }

    createTest(testData) {
        return api.post(`/tests`, testData);
    }

    updateTest(testId, testData) {
        return api.put(`/tests/${testId}`, testData);
    }

    deleteTest(testId) {
        return api.delete(`/tests/${testId}`);
    }

    // Subject-related methods
    getAllSubjects() {
        return api.get(`/subjects`);
    }

    // Grade-related methods
    getAllGrades() {
        return api.get(`/grades`);
    }

    // Test results methods
    getTestResults(testId) {
        return api.get(`/tests/${testId}/results`);
    }

    // Get all test results for the current student
    getStudentResults() {
        return api.get(`/tests/results`);
    }

    // Get a specific test result by ID
    getResultById(resultId) {
        return api.get(`/tests/results/${resultId}`);
    }

    // Check if test is in progress and get the test result id
    getInProgressTest(testId) {
        return api.get(`/tests/${testId}/in-progress`);
    }

    startTest(testId) {
        // Instead of a simple boolean lock, use a request tracking mechanism
        // Store the ongoing request promise so we can return it if called again
        if (this.pendingStartRequest) {
            return this.pendingStartRequest;
        }

        // Create a new request promise
        this.pendingStartRequest = this.getInProgressTest(testId)
            .then(response => {
                // If there's an existing in-progress test, return it
                if (response && response.id) {
                    return response;
                }
                // Otherwise start a new test
                return api.post(`/tests/${testId}/start`);
            })
            .catch(error => {
                console.error("Error in startTest:", error);
                // If the endpoint doesn't exist or returns an error, fallback to original method
                return api.post(`/tests/${testId}/start`);
            })
            .finally(() => {
                // Clear the pending request once completed
                this.pendingStartRequest = null;
            });

        return this.pendingStartRequest;
    }
    getTestResultDetails(resultId) {
        return api.get(`/tests/result/${resultId}`);
    }
    submitTest(submissionData) {
        return api.post(`/tests/submit`, submissionData);
    }
    reactivateTest(id, clearAttempts = false) {
        return api.post(`/tests/${id}/reactivate?clearAttempts=${clearAttempts}`);
    }
    permanentlyDeleteTest(testId) {
        return api.delete(`/tests/${testId}/permanent`);
    }

    getTeacherSubjectsAndGrades() {
        return api.get('/teacher/subjects-and-grades');
    }
    createTestWithFile(formData) {
        return api.post('/tests', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    }
    updateTestWithFile(testId, formData, removeReferenceMaterials = false) {
        return api.put(`/tests/${testId}?removeReferenceMaterials=${removeReferenceMaterials}`,
            formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
        );
    }
    downloadReferenceMaterials(testId, filename) {
        return api.get(`/tests/${testId}/reference-materials`, {
            responseType: 'blob'
        }).then(response => {
            // Create a blob URL and trigger download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename || 'reference-materials');
            document.body.appendChild(link);
            link.click();
            link.remove();

            return true;
        }).catch(error => {
            console.error('Error downloading reference materials:', error);
            throw error;
        });
    }

}

export default new TestService();
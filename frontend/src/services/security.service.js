import api from './api';

const SecurityService = {
    getAllIPs: async () => {
        const response = await api.get('/security');
        return response.data;
    },

    addIP: async (ipData) => {
        const response = await api.post('/security', ipData);
        return response.data;
    },

    updateIP: async (id, ipData) => {
        const response = await api.put(`/security/${id}`, ipData);
        return response.data;
    },

    deleteIP: async (id) => {
        const response = await api.delete(`/security/${id}`);
        return response.data;
    }
};

export default SecurityService;

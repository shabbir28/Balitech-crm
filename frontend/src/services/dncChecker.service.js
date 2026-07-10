import api from './api';

/**
 * Fetch paginated list of DNC uploaded files.
 * @param {Object} params - { page, limit, search, campaign, status, startDate, endDate }
 */
export const fetchUploadedFiles = (params = {}) => {
    return api.get('/dnc-checker/uploaded-files', { params });
};

/**
 * Fetch a single DNC job's details by id.
 * @param {number|string} id
 */
export const fetchDncJobDetails = (id) => {
    return api.get(`/dnc-checker/uploaded-files/${id}`);
};

/**
 * Fetch campaign-level aggregate summary.
 */
export const fetchCampaignSummary = () => {
    return api.get('/dnc-checker/campaigns');
};

/**
 * Analyze a job's clean file against local leads DB.
 * @param {number|string} jobId
 */
export const analyzeCleanFile = (jobId) => {
    return api.post('/dnc-checker/analyze-file', { jobId });
};

/**
 * Fetch paginated list of DNC single lookups.
 * @param {Object} params - { page, limit, search, status, startDate, endDate }
 */
export const fetchSingleLookups = (params = {}) => {
    return api.get('/dnc-checker/single-lookups', { params });
};

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const vendorRoutes = require('./routes/vendors');
const leadRoutes = require('./routes/leads');
const dashboardRoutes = require('./routes/dashboard');
const downloadRoutes = require('./routes/download');
const sessionRoutes = require('./routes/sessions');
const jobRoutes = require('./routes/jobs');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/jobs', jobRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

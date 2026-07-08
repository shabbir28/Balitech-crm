const axios = require('axios');

async function testDownload() {
    try {
        const payload = {
            vendor_id: 'all',
            quantity: 1,
            states: [],
            campaign_id: 'all',
            min_age: null,
            max_age: null,
            force_scrub: false,
            async_scrub: false,
            include_downloaded: false
        };
        // wait, I need a token? Let's just bypass token in backend or use db directly
    } catch (e) {
        
    }
}

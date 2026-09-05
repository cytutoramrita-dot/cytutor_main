// Service to handle Location and Timezone detection

export interface LocationResult {
    city: string;
    country: string;
    timezone?: string;
}
  
// 1. Detect Timezone using Browser Intl API (Reliable, Synchronous)
export const detectTimezone = (): string => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
        console.warn("Timezone detection failed, defaulting to UTC");
        return 'UTC';
    }
};

// 2. IP-Based Geolocation (Fallback)
// Note: Public APIs like ipapi.co are often blocked by ad-blockers.
// We handle this gracefully by returning null instead of throwing.
const getIpLocation = async (): Promise<LocationResult | null> => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // Short 2s timeout

        const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) return null;
        
        const data = await response.json();
        if (data.error) return null;

        return {
            city: data.city || 'Unknown City',
            country: data.country_name || 'Unknown Country',
            timezone: data.timezone
        };
    } catch (error) {
        // Silent failure - adblocker or network issue
        return null;
    }
};

// 3. Browser Geolocation API with Reverse Geocoding
export const detectLocation = async (): Promise<LocationResult> => {
    // Always start with the browser's timezone as a baseline default
    const browserTimezone = detectTimezone();
    const defaultResult: LocationResult = { 
        city: 'Unknown City', 
        country: 'Earth', 
        timezone: browserTimezone 
    };

    return new Promise(async (resolve) => {
        // Helper to handle fallback logic
        const useFallback = async () => {
            const ipResult = await getIpLocation();
            if (ipResult) {
                resolve({ 
                    ...ipResult, 
                    timezone: ipResult.timezone || browserTimezone 
                });
            } else {
                resolve(defaultResult);
            }
        };

        if (!navigator.geolocation) {
            await useFallback();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout for geocoding

                    // Uses BigDataCloud free client-side API
                    const response = await fetch(
                        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
                        { signal: controller.signal }
                    );
                    clearTimeout(timeoutId);

                    if (!response.ok) throw new Error('Geocoding failed');
                    
                    const data = await response.json();
                    resolve({
                        city: data.city || data.locality || 'Unknown City',
                        country: data.countryName || 'Unknown Country',
                        timezone: browserTimezone // Geolocation usually doesn't give TZ, use browser's
                    });
                } catch (e) {
                    // API failed or blocked, try IP fallback
                    await useFallback();
                }
            },
            async (error) => {
                // Permission denied or timeout
                await useFallback();
            },
            { timeout: 5000 }
        );
    });
};
import { tool } from "@langchain/core/tools";
import { z } from "zod";

interface GeocodingResult {
  results?: Array<{
    latitude: number;
    longitude: number;
    name: string;
    country: string;
    country_code?: string;
    admin1?: string;   // State/province
    admin2?: string;   // County/district
  }>;
}

interface WeatherResult {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
    apparent_temperature: number;
  };
}

const WMO_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Icy fog",
  51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
  61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
  71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
  85: "Slight snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
};

function getWeatherDescription(code: number): string {
  return WMO_CODES[code] ?? `Unknown (code ${code})`;
}

export const weatherTool = tool(
  async ({ location }) => {
    console.log(`[Tool] get_weather called for location: "${location}"`);
    try {
      // ── Step 1: Geocode the location ─────────────────────────────────────
      // Fetch up to 5 results so we can detect ambiguity and log alternatives
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=5&language=en&format=json`;
      console.log(`[Weather] Geocoding request: ${geoUrl}`);

      const geoRes = await fetch(geoUrl);
      if (!geoRes.ok) {
        throw new Error(`Geocoding API returned HTTP ${geoRes.status}`);
      }
      const geoData = (await geoRes.json()) as GeocodingResult;
      console.log(`[Weather] Geocoding response (first 500 chars): ${JSON.stringify(geoData).slice(0, 500)}`);

      if (!geoData.results || geoData.results.length === 0) {
        console.warn(`[Weather] No geocoding results found for: "${location}"`);
        return (
          `Could not find a location matching "${location}". ` +
          `Try a more specific name (e.g. "London, UK", "Springfield, Illinois", "Paris, France").`
        );
      }

      // Use the first result (best match from Open-Meteo)
      const match = geoData.results[0];
      const { latitude, longitude, name, country, admin1 } = match;

      // Build a human-readable resolved name that includes state/country for clarity
      const resolvedName = admin1
        ? `${name}, ${admin1}, ${country}`
        : `${name}, ${country}`;

      console.log(`[Weather] Resolved "${location}" → "${resolvedName}" (lat: ${latitude}, lon: ${longitude})`);

      // If there were multiple matches, log them so the developer can see alternatives
      if (geoData.results.length > 1) {
        const alternatives = geoData.results
          .slice(1)
          .map(r => `${r.name}, ${r.admin1 ?? ''}, ${r.country}`.replace(', ,', ','))
          .join(' | ');
        console.log(`[Weather] Other possible matches: ${alternatives}`);
      }

      // ── Step 2: Fetch weather from Open-Meteo ────────────────────────────
      const weatherUrl = [
        `https://api.open-meteo.com/v1/forecast`,
        `?latitude=${latitude}&longitude=${longitude}`,
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`,
        `&wind_speed_unit=kmh&forecast_days=1`,
      ].join('');

      const weatherRes = await fetch(weatherUrl);
      if (!weatherRes.ok) {
        throw new Error(`Weather API returned HTTP ${weatherRes.status}`);
      }
      const weatherData = (await weatherRes.json()) as WeatherResult;

      const {
        temperature_2m,
        apparent_temperature,
        relative_humidity_2m,
        wind_speed_10m,
        weather_code,
      } = weatherData.current;

      const condition = getWeatherDescription(weather_code);

      console.log(`[Weather] Current conditions for ${resolvedName}: ${condition}, ${temperature_2m}°C`);

      return (
        `Current weather in **${resolvedName}**:\n` +
        `• Condition: ${condition}\n` +
        `• Temperature: ${temperature_2m}°C (feels like ${apparent_temperature}°C)\n` +
        `• Humidity: ${relative_humidity_2m}%\n` +
        `• Wind Speed: ${wind_speed_10m} km/h`
      );
    } catch (e: any) {
      console.error(`[Tool] get_weather failed for "${location}":`, e.message);
      return `Failed to fetch weather for "${location}": ${e.message}`;
    }
  },
  {
    name: "get_weather",
    description: "Fetches the current real-time weather for a specified city or location using the free Open-Meteo API. Always tells the user exactly which location was resolved (city, region, country).",
    schema: z.object({
      location: z.string().describe(
        "The city name or location to check weather for. Include a country or region for disambiguation if needed (e.g. 'London', 'Springfield, Illinois', 'Karachi, Pakistan')."
      ),
    }),
  }
);

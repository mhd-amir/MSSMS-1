import axios from 'axios';

const client = axios.create({ baseURL: 'https://api.open-meteo.com/v1', timeout: 8000 });

export async function fetchWeather(latitude, longitude) {
  const { data } = await client.get('/forecast', {
    params: {
      latitude,
      longitude,
      current: 'temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m',
      wind_speed_unit: 'ms',
    },
  });

  return {
    temperature: data.current.temperature_2m,
    humidity: data.current.relative_humidity_2m,
    pressure: data.current.surface_pressure,
    windSpeed: data.current.wind_speed_10m,
    timestamp: new Date(data.current.time),
    source: 'Open-Meteo',
  };
}

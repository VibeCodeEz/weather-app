// API Key
const apiKey = "dceeedec1bb77ec1a75b545fe7b73197";

// DOM Elements
const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const weatherContainer = document.getElementById('weather-container');
const forecastContainer = document.getElementById('forecast-container');
const errorContainer = document.getElementById('error-container');

// Default city
let defaultCity = 'London';

// Event Listeners
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (city) {
    getWeatherData(city);
  }
});

// Function to fetch coordinates by city name
async function getCoordinates(city) {
  try {
    const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`);
    const data = await response.json();
    
    if (data.length === 0) {
      showError('City not found. Please try another city.');
      return null;
    }
    
    return {
      lat: data[0].lat,
      lon: data[0].lon,
      name: data[0].name,
      country: data[0].country
    };
  } catch (error) {
    showError('Failed to fetch coordinates. Please try again.');
    console.error('Error fetching coordinates:', error);
    return null;
  }
}

// Function to get current weather data
async function getCurrentWeather(lat, lon) {
  try {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
    return await response.json();
  } catch (error) {
    showError('Failed to fetch current weather. Please try again.');
    console.error('Error fetching current weather:', error);
    return null;
  }
}

// Function to get forecast data
async function getForecastData(lat, lon) {
  try {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast/daily?lat=${lat}&lon=${lon}&cnt=7&units=metric&appid=${apiKey}`);
    const data = await response.json();
    
    // Check if API returned an error (OpenWeatherMap might have changed their endpoint)
    if (data.cod && data.cod !== "200") {
      // Try the 5-day/3-hour forecast API as fallback
      const fallbackResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
      return await fallbackResponse.json();
    }
    
    return data;
  } catch (error) {
    // If the daily forecast fails, try the 5-day/3-hour forecast API
    try {
      const fallbackResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`);
      return await fallbackResponse.json();
    } catch (fallbackError) {
      showError('Failed to fetch forecast data. Please try again.');
      console.error('Error fetching forecast:', fallbackError);
      return null;
    }
  }
}

// Main function to get weather data
async function getWeatherData(city) {
  showLoading();
  errorContainer.innerHTML = '';
  
  const coordinates = await getCoordinates(city);
  if (!coordinates) {
    hideLoading();
    return;
  }
  
  const currentWeather = await getCurrentWeather(coordinates.lat, coordinates.lon);
  if (!currentWeather) {
    hideLoading();
    return;
  }
  
  const forecastData = await getForecastData(coordinates.lat, coordinates.lon);
  
  displayCurrentWeather(currentWeather, coordinates);
  
  if (forecastData) {
    // Check which API response we got
    if (forecastData.list && forecastData.list[0].dt_txt) {
      // 5-day/3-hour forecast format
      displayHourlyForecast(forecastData);
    } else if (forecastData.list && forecastData.list[0].temp) {
      // Daily forecast format
      displayDailyForecast(forecastData);
    }
  }
  
  hideLoading();
}

// Function to display current weather
function displayCurrentWeather(data, location) {
  const date = new Date();
  const formattedDate = date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const iconUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
  
  weatherContainer.innerHTML = `
    <div class="current-weather">
      <h2 class="city-name">${location.name}, ${location.country}</h2>
      <p class="date">${formattedDate}</p>
      <div class="temp-container">
        <div class="temp">${Math.round(data.main.temp)}°C</div>
        <img src="${iconUrl}" alt="${data.weather[0].description}" class="weather-icon">
      </div>
      <p class="weather-desc">${data.weather[0].description}</p>
      
      <div class="weather-details">
        <div class="detail">
          <p class="detail-label">Feels Like</p>
          <p class="detail-value">${Math.round(data.main.feels_like)}°C</p>
        </div>
        <div class="detail">
          <p class="detail-label">Humidity</p>
          <p class="detail-value">${data.main.humidity}%</p>
        </div>
        <div class="detail">
          <p class="detail-label">Wind</p>
          <p class="detail-value">${(data.wind.speed * 3.6).toFixed(1)} km/h</p>
        </div>
        <div class="detail">
          <p class="detail-label">Pressure</p>
          <p class="detail-value">${data.main.pressure} hPa</p>
        </div>
        <div class="detail">
          <p class="detail-label">Max Temp</p>
          <p class="detail-value">${Math.round(data.main.temp_max)}°C</p>
        </div>
        <div class="detail">
          <p class="detail-label">Min Temp</p>
          <p class="detail-value">${Math.round(data.main.temp_min)}°C</p>
        </div>
      </div>
    </div>
  `;
}

// Function to display daily forecast (if available)
function displayDailyForecast(data) {
  forecastContainer.innerHTML = `
    <h2>7-Day Forecast</h2>
    <div class="forecast-container">
      ${data.list.map((day, index) => {
        if (index === 0) return ''; // Skip current day
        
        const date = new Date(day.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const iconUrl = `https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png`;
        
        return `
          <div class="forecast-day">
            <p class="forecast-date">${dayName}, ${monthDay}</p>
            <img src="${iconUrl}" alt="${day.weather[0].description}" class="forecast-icon">
            <p class="weather-desc">${day.weather[0].description}</p>
            <div class="forecast-temp">
              <span class="max-temp">${Math.round(day.temp.max)}°</span>
              <span class="min-temp">${Math.round(day.temp.min)}°</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Function to display 5-day/3-hour forecast as daily forecast
function displayHourlyForecast(data) {
  // Group forecast by day
  const dailyForecasts = {};
  
  data.list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const day = date.toLocaleDateString('en-US');
    
    if (!dailyForecasts[day]) {
      dailyForecasts[day] = {
        date: date,
        temps: [],
        icons: [],
        descriptions: []
      };
    }
    
    dailyForecasts[day].temps.push(item.main.temp);
    dailyForecasts[day].icons.push(item.weather[0].icon);
    dailyForecasts[day].descriptions.push(item.weather[0].description);
  });
  
  // Convert to array and sort by date
  const dailyForecastsArray = Object.values(dailyForecasts);
  
  // Only keep 5 days (current + 4)
  const forecastDays = dailyForecastsArray.slice(0, 5);
  
  forecastContainer.innerHTML = `
    <h2>5-Day Forecast</h2>
    <div class="forecast-container">
      ${forecastDays.map((day, index) => {
        if (index === 0 && forecastDays.length > 1) return ''; // Skip current day if we have enough days
        
        const dayName = day.date.toLocaleDateString('en-US', { weekday: 'short' });
        const monthDay = day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Get most frequent icon
        const iconCounts = {};
        day.icons.forEach(icon => {
          iconCounts[icon] = (iconCounts[icon] || 0) + 1;
        });
        const mostFrequentIcon = Object.keys(iconCounts).reduce((a, b) => 
          iconCounts[a] > iconCounts[b] ? a : b
        );
        
        // Get most frequent description
        const descCounts = {};
        day.descriptions.forEach(desc => {
          descCounts[desc] = (descCounts[desc] || 0) + 1;
        });
        const mostFrequentDesc = Object.keys(descCounts).reduce((a, b) => 
          descCounts[a] > descCounts[b] ? a : b
        );
        
        const iconUrl = `https://openweathermap.org/img/wn/${mostFrequentIcon}@2x.png`;
        
        // Calculate min and max temps
        const maxTemp = Math.round(Math.max(...day.temps));
        const minTemp = Math.round(Math.min(...day.temps));
        
        return `
          <div class="forecast-day">
            <p class="forecast-date">${dayName}, ${monthDay}</p>
            <img src="${iconUrl}" alt="${mostFrequentDesc}" class="forecast-icon">
            <p class="weather-desc">${mostFrequentDesc}</p>
            <div class="forecast-temp">
              <span class="max-temp">${maxTemp}°</span>
              <span class="min-temp">${minTemp}°</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Helper functions
function showLoading() {
  weatherContainer.innerHTML = '<div class="loading">Loading...</div>';
  forecastContainer.innerHTML = '';
}

function hideLoading() {
  const loadingEl = document.querySelector('.loading');
  if (loadingEl) {
    loadingEl.remove();
  }
}

function showError(message) {
  errorContainer.innerHTML = `<div class="error">${message}</div>`;
}

// Initialize app with default city
window.addEventListener('DOMContentLoaded', () => {
  getWeatherData(defaultCity);
});
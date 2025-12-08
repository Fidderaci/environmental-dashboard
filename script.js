/* BEGIN Jeta Sylejmani */
const form = document.getElementById("location-form");
const cityInput = document.getElementById("city-input");
const errorMessage = document.getElementById("error-message");

const locationTitle = document.getElementById("location-title");
const locationDetails = document.getElementById("location-details");
const timestampElement = document.getElementById("timestamp");

const aqiValue = document.getElementById("aqi-value");
const aqiDescription = document.getElementById("aqi-description");

const uvValue = document.getElementById("uv-value");
const uvDescription = document.getElementById("uv-description");

const pm10Value = document.getElementById("pm10-value");
const pm25Value = document.getElementById("pm25-value");
const o3Value = document.getElementById("o3-value");

const autocompleteList = document.getElementById("autocomplete-list");

cityInput.addEventListener("input", async function () {
    const query = cityInput.value.trim();

    if (query.length < 2) {
        autocompleteList.style.display = "none";
        return;
    }

    const url =
        "https://geocoding-api.open-meteo.com/v1/search?name=" +
        encodeURIComponent(query) +
        "&count=5&language=en&format=json";

    try {
        const response = await fetch(url);
        const data = await response.json();

        autocompleteList.innerHTML = "";

        if (!data.results) {
            autocompleteList.style.display = "none";
            return;
        }

        data.results.forEach(function (city) {
            const item = document.createElement("li");
            item.className = "list-group-item list-group-item-action";
            let label = city.name;

            if (city.admin1) {
                label += ", " + city.admin1;
            }
            label += ", " + city.country;
            item.textContent = label;

            item.addEventListener("click", function () {
                cityInput.value = city.name;
                autocompleteList.style.display = "none";
                form.requestSubmit();
            });

            autocompleteList.appendChild(item);
        });

        autocompleteList.style.display = "block";
    } catch (err) {
        autocompleteList.style.display = "none";
    }
});

document.addEventListener("click", function (event) {
    if (!autocompleteList.contains(event.target) && event.target !== cityInput) {
        autocompleteList.style.display = "none";
    }
});
/* END Jeta Sylejmani */


/* BEGIN Adi Haxhiaj */
form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const city = cityInput.value.trim();
    if (!city) {
        showError("Please enter a city name.");
        return;
    }

    clearError();
    setLoadingState(true);

    try {
        const location = await fetchLocation(city);
        if (!location) {
            showError("City not found. Try another name.");
            setLoadingState(false);
            return;
        }

        const latitude = location.latitude;
        const longitude = location.longitude;

        const results = await Promise.all([
            fetchAirQualityAndPollution(latitude, longitude),
            fetchUvIndex(latitude, longitude)
        ]);

        const airQualityData = results[0];
        const uvData = results[1];

        updateUi(location, airQualityData, uvData);
    } catch (error) {
        showError("Something went wrong while loading data.");
    } finally {
        setLoadingState(false);
    }
});

function setLoadingState(isLoading) {
    const button = document.getElementById("search-button");
    if (!button) {
        return;
    }
    button.disabled = isLoading;
    button.textContent = isLoading ? "Loading..." : "Search";
}

function showError(message) {
    errorMessage.textContent = message;
}

function clearError() {
    errorMessage.textContent = "";
}

async function fetchLocation(city) {
    const url =
        "https://geocoding-api.open-meteo.com/v1/search?name=" +
        encodeURIComponent(city) +
        "&count=1&language=en&format=json";

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Geocoding request failed");
    }

    const data = await response.json();
    if (!data.results || data.results.length === 0) {
        return null;
    }

    const result = data.results[0];
    return {
        name: result.name,
        country: result.country,
        latitude: result.latitude,
        longitude: result.longitude,
        timezone: result.timezone
    };
}
/* END Adi Haxhiaj */

/* BEGIN Anes Fonda */
async function fetchAirQualityAndPollution(latitude, longitude) {
    const url =
        "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=" +
        latitude +
        "&longitude=" +
        longitude +
        "&hourly=european_aqi,pm10,pm2_5,ozone&timezone=auto";

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Air quality request failed");
    }

    const data = await response.json();
    if (!data.hourly || !data.hourly.european_aqi || data.hourly.european_aqi.length === 0) {
        return null;
    }

    const aqiArray = data.hourly.european_aqi;
    const timeArray = data.hourly.time;
    const pm10Array = data.hourly.pm10;
    const pm25Array = data.hourly.pm2_5;
    const o3Array = data.hourly.ozone;

    let pickedIndex = -1;
    for (let i = aqiArray.length - 1; i >= 0; i--) {
        if (typeof aqiArray[i] === "number") {
            pickedIndex = i;
            break;
        }
    }

    if (pickedIndex === -1) {
        return null;
    }

    const aqi = aqiArray[pickedIndex];
    const time = timeArray[pickedIndex];

    let pm10 = null;
    if (pm10Array && pm10Array.length > pickedIndex && typeof pm10Array[pickedIndex] === "number") {
        pm10 = pm10Array[pickedIndex];
    }

    let pm25 = null;
    if (pm25Array && pm25Array.length > pickedIndex && typeof pm25Array[pickedIndex] === "number") {
        pm25 = pm25Array[pickedIndex];
    }

    let o3 = null;
    if (o3Array && o3Array.length > pickedIndex && typeof o3Array[pickedIndex] === "number") {
        o3 = o3Array[pickedIndex];
    }

    return {
        aqiValue: aqi,
        time: time,
        pm10: pm10,
        pm25: pm25,
        o3: o3
    };
}
/* END Anes Fonda */

/* BEGIN Luis Moreno */
async function fetchUvIndex(latitude, longitude) {
    const url =
        "https://api.open-meteo.com/v1/forecast?latitude=" + latitude + "&longitude=" + longitude + "&current=uv_index&timezone=auto";

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("UV request failed");
    }

    const data = await response.json();

    if (!data.current || typeof data.current.uv_index !== "number") {
        return null;
    }

    return {
        value: data.current.uv_index,
        time: data.current.time
    };
}

function updateUi(location, airQualityData, uvData) {
    locationTitle.textContent = location.name + ", " + location.country;
    locationDetails.textContent =
        "Latitude: " +
        location.latitude.toFixed(2) +
        ", Longitude: " +
        location.longitude.toFixed(2);

    timestampElement.textContent = new Intl.DateTimeFormat("en-GB", {
        dateStyle: "short",
        timeStyle: "medium",
        timeZone: location.timezone
    }).format(new Date());

    if (airQualityData && typeof airQualityData.aqiValue === "number") {
        aqiValue.textContent = airQualityData.aqiValue.toFixed(0);
        aqiDescription.textContent = describeAqi(airQualityData.aqiValue);
    } else {
        aqiValue.textContent = "N/A";
        aqiDescription.textContent = "No air quality data.";
    }

    if (uvData && typeof uvData.value === "number") {
        uvValue.textContent = uvData.value.toFixed(1);
        uvDescription.textContent = describeUv(uvData.value);
    } else {
        uvValue.textContent = "N/A";
        uvDescription.textContent = "No UV data.";
    }

    if (airQualityData) {
        if (typeof airQualityData.pm10 === "number") {
            pm10Value.textContent = airQualityData.pm10.toFixed(1);
        } else {
            pm10Value.textContent = "N/A";
        }

        if (typeof airQualityData.pm25 === "number") {
            pm25Value.textContent = airQualityData.pm25.toFixed(1);
        } else {
            pm25Value.textContent = "N/A";
        }

        if (typeof airQualityData.o3 === "number") {
            o3Value.textContent = airQualityData.o3.toFixed(1);
        } else {
            o3Value.textContent = "N/A";
        }
    } else {
        pm10Value.textContent = "N/A";
        pm25Value.textContent = "N/A";
        o3Value.textContent = "N/A";
    }
    const healthElement = document.getElementById("health-message");
    const aqi = airQualityData ? airQualityData.aqiValue : null;
    const uv = uvData ? uvData.value : null;

    healthElement.textContent = getHealthRecommendation(aqi, uv);
}
/* END Luis Moreno */

/* BEGIN Fidan Hasani */
function describeAqi(value) {
    if (value <= 20) {
        return "Good air quality.";
    }
    if (value <= 40) {
        return "Fair air quality.";
    }
    if (value <= 60) {
        return "Moderate air quality.";
    }
    if (value <= 80) {
        return "Poor air quality.";
    }
    return "Very poor air quality.";
}

function describeUv(value) {
    if (value < 3) {
        return "Low UV risk.";
    }
    if (value < 6) {
        return "Moderate UV risk.";
    }
    if (value < 8) {
        return "High UV risk.";
    }
    if (value < 11) {
        return "Very high UV risk.";
    }
    return "Extreme UV risk.";
}

function getHealthRecommendation(aqi, uv) {
    let messages = [];

    if (typeof aqi === "number") {
        if (aqi <= 20) messages.push("Air quality is good - outdoor activity is safe.");
        else if (aqi <= 40) messages.push("Air quality is generally acceptable - most people can continue normal outdoor activities.");
        else if (aqi <= 60) messages.push("Moderate air quality - consider reducing prolonged outdoor exertion.");
        else if (aqi <= 80) messages.push("Poor air quality - limit outdoor activity if possible.");
        else messages.push("Very poor air quality - avoid outdoor exertion.");
    }

    if (typeof uv === "number") {
        if (uv < 3) messages.push("UV radiation is low - minimal protection needed.");
        else if (uv < 6) messages.push("Moderate UV - use sunscreen and wear sunglasses.");
        else if (uv < 8) messages.push("High UV - use SPF30+, sunglasses and seek shade midday.");
        else if (uv < 11) messages.push("Very high UV - reduce sun exposure and wear protective clothing.");
        else messages.push("Extreme UV - avoid sun exposure, especially midday.");
    }

    if (messages.length === 0) {
        return "No recommendation available.";
    }

    return messages.join(" ");
}
/* END Fidan Hasani */

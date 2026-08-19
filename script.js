function showPage(pageId) {
    const pages = document.querySelectorAll(".page");

    pages.forEach(function(page) {
        page.classList.remove("active");
    });

    const selectedPage = document.getElementById(pageId);

    if (selectedPage) {
        selectedPage.classList.add("active");
    }
}

function getLocation() {
    const locationText = document.getElementById("locationText");

    if (!navigator.geolocation) {
        locationText.innerText = "Bu cihaz konum özelliğini desteklemiyor.";
        return;
    }

    locationText.innerText = "📍 Konum aranıyor...";

    navigator.geolocation.getCurrentPosition(

        function(position) {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            locationText.innerHTML =
                "✅ Konum bulundu!<br>" +
                "Enlem: " + latitude.toFixed(4) +
                "<br>Boylam: " + longitude.toFixed(4);
        },

        function(error) {
            locationText.innerText =
                "❌ Konum alınamadı. Hata kodu: " + error.code;
        },

        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}
async function getWeather(latitude, longitude) {

    const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${latitude}` +
        `&longitude=${longitude}` +
`&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,pressure_msl,cloud_cover,wind_speed_10m,wind_gusts_10m,wind_direction_10m` +        `&daily=sunrise,sunset` +
        `&timezone=auto` +
        `&forecast_days=7`;

    const result = document.getElementById("forecastResult");

    result.innerHTML = "🌦️ Hava verileri yükleniyor...";

    try {

        const response = await fetch(url);
        const data = await response.json();

        console.log(data);

        const now = new Date();

        let currentIndex = data.hourly.time.findIndex(time => {
            const hour = new Date(time);
            return hour.getHours() === now.getHours();
        });

        if (currentIndex === -1) {
            currentIndex = 0;
        }

        result.innerHTML = `
            <div class="weather-card">

               <div class="weather-card">

    <h3>🌦️ Şu An</h3>

    <div class="weather-grid">

        <div class="weather-item">
            <span>🌡️ Sıcaklık</span>
            <strong>
                ${data.hourly.temperature_2m[currentIndex]} °C
            </strong>
        </div>

        <div class="weather-item">
            <span>💨 Rüzgâr</span>
            <strong>
                ${data.hourly.wind_speed_10m[currentIndex]} km/sa
            </strong>
        </div>

        <div class="weather-item">
            <span>🧭 Rüzgâr yönü</span>
            <strong>
                ${getWindDirection(
                    data.hourly.wind_direction_10m[currentIndex]
                )}
            </strong>
        </div>

        <div class="weather-item">
            <span>🌧️ Yağmur</span>
            <strong>
                %${data.hourly.precipitation_probability[currentIndex]}
            </strong>
        </div>

        <div class="weather-item">
            <span>💧 Nem</span>
            <strong>
                %${data.hourly.relative_humidity_2m[currentIndex]}
            </strong>
        </div>

        <div class="weather-item">
            <span>☁️ Bulut</span>
            <strong>
                %${data.hourly.cloud_cover[currentIndex]}
            </strong>
        </div>

        <div class="weather-item">
            <span>🎈 Basınç</span>
            <strong>
                ${data.hourly.pressure_msl[currentIndex]} hPa
            </strong>
        </div>

        <div class="weather-sun">

            <div class="weather-item">
                <span>🌅 Gün doğumu</span>
                <strong>
                    ${data.daily.sunrise[0].split("T")[1]}
                </strong>
            </div>

            <div class="weather-item">
                <span>🌇 Gün batımı</span>
                <strong>
                    ${data.daily.sunset[0].split("T")[1]}
                </strong>
            </div>

        </div>

    </div>

</div>

                <p>🌧️ %${data.hourly.precipitation_probability[currentIndex]}</p>

                <p>💧 %${data.hourly.relative_humidity_2m[currentIndex]}</p>

                <p>🌤️ %${data.hourly.cloud_cover[currentIndex]}</p>

                <p>🧭 ${data.hourly.pressure_msl[currentIndex]} hPa</p>

                <p>🌅 ${data.daily.sunrise[0].split("T")[1]}</p>

                <p>🌇 ${data.daily.sunset[0].split("T")[1]}</p>

            </div>
        `;
        const dailyRating = calculateDailyFishingRating(data);

result.innerHTML += `
    <div class="daily-rating rating-${dailyRating.rating}">
        <div class="rating-title">
            🎣 Bugünün Av Puanı
        </div>

        <div class="rating-number">
            ${dailyRating.rating}/5 ${dailyRating.icon}
        </div>

        <div class="rating-label">
            ${dailyRating.label}
        </div>

        <div class="rating-bar">
            ${"★".repeat(dailyRating.rating)}
            ${"☆".repeat(5 - dailyRating.rating)}
        </div>
        <div class="rating-reasons">

    <h3>Koşullar</h3>

    ${getFishingReasons(data)
        .map(reason => `<p>${reason}</p>`)
        .join("")}

</div>
    </div>
`;
createDailySummary(data);
createWeeklyForecast(data);
createFishForecast(data);
    } catch (error) {

        console.error(error);

        result.innerHTML =
            "❌ Hava verileri alınamadı.";
    }
}
function createDailySummary(data) {

    const sunrise = new Date(data.daily.sunrise[0]);
    const sunset = new Date(data.daily.sunset[0]);

    const sunriseHour = sunrise.getHours();
    const sunsetHour = sunset.getHours();

    const now = new Date();
    let predictions = [];

    for (let i = 0; i < data.hourly.time.length; i++) {

        const date = new Date(data.hourly.time[i]);

        // Sadece bugünün saatlerini kullan
        if (date.getDate() !== now.getDate()) {
            continue;
        }

        const hour = date.getHours();

        const weather = {
            temperature: data.hourly.temperature_2m[i],
            wind: data.hourly.wind_speed_10m[i],
            pressure: data.hourly.pressure_msl[i],
            rain: data.hourly.precipitation_probability[i],
            cloud: data.hourly.cloud_cover[i]
        };

        const fishes = [
            {
                name: "Sazan",
                emoji: "🐟",
                score: calculateFishScore(
                    "sazan",
                    weather,
                    hour,
                    sunriseHour,
                    sunsetHour
                )
            },

            {
                name: "Turna",
                emoji: "🐊",
                score: calculateFishScore(
                    "turna",
                    weather,
                    hour,
                    sunriseHour,
                    sunsetHour
                )
            },

            {
                name: "Levrek",
                emoji: "🐠",
                score: calculateFishScore(
                    "levrek",
                    weather,
                    hour,
                    sunriseHour,
                    sunsetHour
                )
            }
        ];

        fishes.forEach(function(fish) {

            predictions.push({
                name: fish.name,
                emoji: fish.emoji,
                score: fish.score,
                hour: hour,
                temperature: weather.temperature,
                wind: weather.wind,
                pressure: weather.pressure
            });

        });
    }

    // En iyi sonuçları en üste getir
    predictions.sort(function(a, b) {
        return b.score - a.score;
    });

    const best = predictions[0];

    // En iyi 3 farklı saati bul
    const topTimes = [];
    const usedHours = new Set();

    for (const prediction of predictions) {

        if (!usedHours.has(prediction.hour)) {

            topTimes.push(prediction);
            usedHours.add(prediction.hour);

        }

        if (topTimes.length === 3) {
            break;
        }
    }

    const summary = document.createElement("div");

    summary.className = "daily-summary";

    summary.innerHTML = `

        <p class="summary-label">
            🏆 BUGÜNÜN EN İYİ AVI
        </p>

        <div class="summary-fish">
            ${best.emoji} ${best.name}
        </div>

        <div class="summary-score">
            %${best.score}
        </div>

        <p>Aktivite skoru</p>

        <div class="best-hour">

            ⏰ En iyi saat:

            <strong>
                ${String(best.hour).padStart(2, "0")}:00
            </strong>

        </div>

        <div class="summary-weather">

            🌡️ ${best.temperature} °C

            &nbsp;

            💨 ${best.wind} km/s

            &nbsp;

            🧭 ${best.pressure} hPa

        </div>

        <h3>
            🎣 Bugün Önerilen Saatler
        </h3>

        ${topTimes.map(function(item, index) {

            let icon = "🟢";

            if (index === 0) {
                icon = "🔥";
            }

            return `

                <div class="recommended-time">

                    <span>

                        ${icon}

                        ${String(item.hour).padStart(2, "0")}:00

                    </span>

                    <span>

                        ${item.emoji}

                        ${item.name}

                        <strong>
                            %${item.score}
                        </strong>

                    </span>

                </div>

            `;

        }).join("")}

    `;

    const fishSection =
        document.querySelector(".fish-section");

    if (fishSection) {

        fishSection.before(summary);

    }
}
let map;
let mapMarker;
let selectedLatitude = null;
let selectedLongitude = null;

function openMap() {

    const mapContainer =
        document.getElementById("mapContainer");

    mapContainer.style.display = "block";

    if (!map) {

        map = L.map("map").setView(
            [38.4237, 27.1428],
            9
        );

        L.tileLayer(
            "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                maxZoom: 19,
                attribution:
                    '&copy; OpenStreetMap contributors'
            }
        ).addTo(map);
showSavedFishingSpots();
        map.on("click", function(event) {

            const latitude = event.latlng.lat;
            const longitude = event.latlng.lng;
selectedLatitude = latitude;
selectedLongitude = longitude;

document.getElementById("saveSpotButton").style.display = "inline-block";
            if (mapMarker) {
                mapMarker.setLatLng(
                    [latitude, longitude]
                );
            } else {

                mapMarker = L.marker(
                    [latitude, longitude]
                ).addTo(map);

            }

            document.getElementById(
                "selectedLocation"
            ).innerHTML =
                "📌 Seçilen konum:<br>" +
                latitude.toFixed(5) +
                ", " +
                longitude.toFixed(5);

            getWeather(
                latitude,
                longitude
            );

        });
    }

    setTimeout(function() {
        map.invalidateSize();
    }, 100);
}
function saveFishingSpot() {

    if (selectedLatitude === null || selectedLongitude === null) {
        alert("Önce haritadan bir konum seç.");
        return;
    }

    const spotName = prompt(
        "🎣 Bu av noktasına bir isim ver:",
        "Favori Av Noktam"
    );

    if (!spotName) return;

    const note = prompt(
        "📝 Bu nokta için bir not ekle:",
        ""
    );

    const spots =
        JSON.parse(localStorage.getItem("fishingSpots")) || [];

    const newSpot = {
        id: Date.now(),
        name: spotName,
        note: note || "",
        latitude: selectedLatitude,
        longitude: selectedLongitude
    };

    spots.push(newSpot);

localStorage.setItem(
    "fishingSpots",
    JSON.stringify(spots)
);

// Kaydedilen noktayı hemen haritada göster
const savedMarker = L.marker([
    selectedLatitude,
    selectedLongitude
]).addTo(map);

savedMarker.bindPopup(`
    <strong>⭐ ${spotName}</strong><br>
    🎣 Av Noktası<br>
    <button onclick="getWeather(${selectedLatitude}, ${selectedLongitude})">
        🌦️ Bu Konumun Tahminini Gör
    </button>
`);

savedMarker.openPopup();
showFavoriteSpots();
alert("⭐ Av noktası kaydedildi!");
}

function showSavedFishingSpots() {

    if (!map) return;

    const spots =
        JSON.parse(localStorage.getItem("fishingSpots")) || [];

    spots.forEach(function(spot) {

        const marker = L.marker([
            spot.latitude,
            spot.longitude
        ]).addTo(map);

        marker.bindPopup(`
            <strong>⭐ ${spot.name}</strong><br>
            🎣 Av Noktası<br>
            ${spot.note ? "📝 " + spot.note + "<br>" : ""}
            <button onclick="getWeather(${spot.latitude}, ${spot.longitude})">
                🌦️ Bu Konumun Tahminini Gör
            </button>
        `);

    });
}
function calculateDailyFishingRating(data) {
    const today = new Date().getDate();

    let totalScore = 0;
    let count = 0;

    for (let i = 0; i < data.hourly.time.length; i++) {
        const date = new Date(data.hourly.time[i]);

        if (date.getDate() !== today) continue;

        const temp = data.hourly.temperature_2m[i];
        const wind = data.hourly.wind_speed_10m[i];
        const pressure = data.hourly.pressure_msl[i];
        const rain = data.hourly.precipitation_probability[i];
        const cloud = data.hourly.cloud_cover[i];

        let score = 50;

        // Sıcaklık
        if (temp >= 15 && temp <= 28) score += 10;
        if (temp > 34 || temp < 8) score -= 15;

        // Rüzgar
        if (wind >= 3 && wind <= 18) score += 10;
        if (wind > 30) score -= 20;

        // Basınç
        if (pressure >= 1005 && pressure <= 1020) score += 10;

        // Yağış
        if (rain <= 20) score += 5;
        if (rain > 70) score -= 15;

        // Bulut
        if (cloud >= 20 && cloud <= 80) score += 5;

        totalScore += score;
        count++;
    }

    const average = count ? totalScore / count : 50;

    let rating = 3;
    let label = "Orta";
    let icon = "🟡";

    if (average < 40) {
        rating = 1;
        label = "Çok Kötü";
        icon = "🔴";
    } else if (average < 50) {
        rating = 2;
        label = "Kötü";
        icon = "🟠";
    } else if (average < 65) {
        rating = 3;
        label = "Orta";
        icon = "🟡";
    } else if (average < 80) {
        rating = 4;
        label = "İyi";
        icon = "🟢";
    } else {
        rating = 5;
        label = "Çok İyi";
        icon = "🟢";
    }

    return {
        rating,
        label,
        icon,
        rawScore: Math.round(average)
    };
}
function getWindDirection(degree) {
    if (degree === null || degree === undefined) {
        return "Bilinmiyor";
    }

    const directions = [
        "K ↑ Kuzey",
        "KD ↗ Kuzeydoğu",
        "D → Doğu",
        "GD ↘ Güneydoğu",
        "G ↓ Güney",
        "GB ↙ Güneybatı",
        "B ← Batı",
        "KB ↖ Kuzeybatı"
    ];

    const index = Math.round(degree / 45) % 8;

    return directions[index];
}
function getFishingReasons(data) {

    const now = new Date();

    let currentIndex = data.hourly.time.findIndex(time => {
        return new Date(time).getHours() === now.getHours();
    });

    if (currentIndex === -1) currentIndex = 0;

    const temp = data.hourly.temperature_2m[currentIndex];
    const wind = data.hourly.wind_speed_10m[currentIndex];
    const pressure = data.hourly.pressure_msl[currentIndex];
    const rain = data.hourly.precipitation_probability[currentIndex];
    const windDirection =
        data.hourly.wind_direction_10m[currentIndex];
const cloud = data.hourly.cloud_cover[currentIndex];

const hour = new Date(
    data.hourly.time[currentIndex]
).getHours();

const sunriseHour = new Date(
    data.daily.sunrise[0]
).getHours();

const sunsetHour = new Date(
    data.daily.sunset[0]
).getHours();

const weather = {
    temperature: temp,
    wind: wind,
    pressure: pressure,
    rain: rain,
    cloud: cloud
};
const fishScores = [
    {
        name: "Sazan",
        emoji: "🐟",
        score: calculateFishScore("sazan", weather, hour, sunriseHour, sunsetHour)
    },
    {
        name: "Turna",
        emoji: "🐊",
        score: calculateFishScore("turna", weather, hour, sunriseHour, sunsetHour)
    },
    {
        name: "Levrek",
        emoji: "🐠",
        score: calculateFishScore("levrek", weather, hour, sunriseHour, sunsetHour)
    }
];

fishScores.sort((a, b) => b.score - a.score);

const bestFish = fishScores[0];
    let reasons = [];

    // SICAKLIK
    if (temp >= 15 && temp <= 28) {
        reasons.push(`🟢 🌡️ Sıcaklık ${temp}°C • Uygun`);
    } else if (temp >= 10 && temp <= 32) {
        reasons.push(`🟡 🌡️ Sıcaklık ${temp}°C • Orta`);
    } else {
        reasons.push(`🔴 🌡️ Sıcaklık ${temp}°C • Elverişsiz`);
    }

    // RÜZGAR
    if (wind >= 3 && wind <= 18) {
        reasons.push(`🟢 💨 Rüzgâr ${wind} km/s • Uygun`);
    } else if (wind <= 25) {
        reasons.push(`🟡 💨 Rüzgâr ${wind} km/s • Orta`);
    } else {
        reasons.push(`🔴 💨 Rüzgâr ${wind} km/s • Güçlü`);
    }

    // RÜZGAR YÖNÜ
    reasons.push(
        `🧭 ${getWindDirection(windDirection)}`
    );

    // YAĞIŞ
    if (rain <= 20) {
        reasons.push(`🟢 🌧️ Yağış %${rain} • Düşük`);
    } else if (rain <= 60) {
        reasons.push(`🟡 🌧️ Yağış %${rain} • Orta`);
    } else {
        reasons.push(`🔴 🌧️ Yağış %${rain} • Yüksek`);
    }

    // BASINÇ
    if (pressure >= 1005 && pressure <= 1020) {
        reasons.push(`🟢 🧭 Basınç ${pressure} hPa • Uygun`);
    } else if (pressure >= 995 && pressure <= 1025) {
        reasons.push(`🟡 🧭 Basınç ${pressure} hPa • Orta`);
    } else {
        reasons.push(`🔴 🧭 Basınç ${pressure} hPa • Elverişsiz`);
    }

    return reasons;
}
getWeather(38.4237, 27.1428);
function calculateFishScore(fish, weather, hour, sunriseHour, sunsetHour) {
    let score = 35;

    const temp = weather.temperature;
    const wind = weather.wind;
    const pressure = weather.pressure;
    const rain = weather.rain;
    const cloud = weather.cloud;

    // Gün doğumu / gün batımı etkisi
    const nearSunrise = Math.abs(hour - sunriseHour) <= 2;
    const nearSunset = Math.abs(hour - sunsetHour) <= 2;

    if (nearSunrise || nearSunset) {
        score += 10;
    }

    // Hafif yağış / bulut avantajı
    if (cloud >= 30 && cloud <= 80) {
        score += 5;
    }

    if (rain > 0 && rain <= 40) {
        score += 3;
    }

    // Çok sert rüzgar cezası
    if (wind > 30) {
        score -= 20;
    } else if (wind >= 5 && wind <= 20) {
        score += 5;
    }

    // Basınç
    if (pressure >= 1005 && pressure <= 1020) {
        score += 5;
    }

    // BALIK TÜRÜNE ÖZEL KURALLAR

    if (fish === "sazan") {
        if (temp >= 18 && temp <= 26) score += 15;
        if (temp < 12 || temp > 32) score -= 20;

        if (hour >= 5 && hour <= 9) score += 10;
        if (hour >= 18 && hour <= 22) score += 15;
    }

    if (fish === "turna") {
        if (temp >= 10 && temp <= 22) score += 15;
        if (temp > 28) score -= 20;

        if (hour >= 6 && hour <= 10) score += 15;
        if (hour >= 16 && hour <= 20) score += 10;
    }

    if (fish === "levrek") {
        if (temp >= 12 && temp <= 24) score += 15;

        if (hour >= 5 && hour <= 8) score += 15;
        if (hour >= 18 && hour <= 23) score += 15;

        if (cloud > 40) score += 5;
    }

    return Math.max(5, Math.min(95, score));
}
function createFishForecast(data) {
    const result = document.getElementById("forecastResult");

    const sunrise = new Date(data.daily.sunrise[0]);
    const sunset = new Date(data.daily.sunset[0]);

    const sunriseHour = sunrise.getHours();
    const sunsetHour = sunset.getHours();

    let html = `
        <div class="fish-section">
            <h2>🎣 Saatlik Balık Tahmini</h2>
            <p class="fish-subtitle">
                Hava ve gün ışığı koşullarına göre hesaplandı.
            </p>
        </div>
    `;

    const now = new Date();

    for (let i = 0; i < data.hourly.time.length; i++) {
        const date = new Date(data.hourly.time[i]);

        // Sadece bugün
        if (date.getDate() !== now.getDate()) {
            continue;
        }

        const hour = date.getHours();

        const weather = {
            temperature: data.hourly.temperature_2m[i],
            wind: data.hourly.wind_speed_10m[i],
            pressure: data.hourly.pressure_msl[i],
            rain: data.hourly.precipitation_probability[i],
            cloud: data.hourly.cloud_cover[i]
        };

        const sazan = calculateFishScore(
            "sazan",
            weather,
            hour,
            sunriseHour,
            sunsetHour
        );

        const turna = calculateFishScore(
            "turna",
            weather,
            hour,
            sunriseHour,
            sunsetHour
        );

        const levrek = calculateFishScore(
            "levrek",
            weather,
            hour,
            sunriseHour,
            sunsetHour
        );

        const fishList = [
            { name: "Sazan", emoji: "🐟", score: sazan },
            { name: "Turna", emoji: "🐊", score: turna },
            { name: "Levrek", emoji: "🐠", score: levrek }
        ];

        fishList.sort((a, b) => b.score - a.score);

        const bestFish = fishList[0];

        let status = "Zayıf";

        if (bestFish.score >= 80) status = "🔥 Çok İyi";
        else if (bestFish.score >= 65) status = "🟢 İyi";
        else if (bestFish.score >= 50) status = "🟡 Normal";
        else status = "🔴 Zayıf";

html += `
    <div class="hour-card">

        <div class="hour-title">
            <strong>🕐 ${String(hour).padStart(2, "0")}:00</strong>
            <span>${status}</span>
        </div>

        <div class="best-fish">
            <span class="best-label">En iyi seçim</span>
            <span class="best-result">
                ${bestFish.emoji} <strong>${bestFish.name}</strong>
                <b>%${bestFish.score}</b>
            </span>
        </div>

        <div class="fish-scores">
            <span>🐟 Sazan <b>%${sazan}</b></span>
            <span>🐊 Turna <b>%${turna}</b></span>
            <span>🐠 Levrek <b>%${levrek}</b></span>
        </div>

    </div>
`;
    }

    result.innerHTML += html;
}
function createWeeklyForecast(data) {
    const weeklyCards = document.getElementById("weeklyCards");

    if (!weeklyCards) return;

    weeklyCards.innerHTML = "";

    const days = {};

    // Saatlik verileri günlere ayır
    for (let i = 0; i < data.hourly.time.length; i++) {

        const date = new Date(data.hourly.time[i]);
        const dayKey = data.hourly.time[i].split("T")[0];
        const hour = date.getHours();

        if (!days[dayKey]) {
            days[dayKey] = [];
        }

        const weather = {
            temperature: data.hourly.temperature_2m[i],
            wind: data.hourly.wind_speed_10m[i],
            pressure: data.hourly.pressure_msl[i],
            rain: data.hourly.precipitation_probability[i],
            cloud: data.hourly.cloud_cover[i]
        };

        // O günün sunrise / sunset bilgisini bul
        const dailyIndex = data.daily.time.indexOf(dayKey);

        if (dailyIndex === -1) continue;

        const sunrise = new Date(data.daily.sunrise[dailyIndex]);
        const sunset = new Date(data.daily.sunset[dailyIndex]);

        const sunriseHour = sunrise.getHours();
        const sunsetHour = sunset.getHours();

        const fishList = [
            {
                name: "Sazan",
                emoji: "🐟",
                score: calculateFishScore(
                    "sazan",
                    weather,
                    hour,
                    sunriseHour,
                    sunsetHour
                )
            },
            {
                name: "Turna",
                emoji: "🐊",
                score: calculateFishScore(
                    "turna",
                    weather,
                    hour,
                    sunriseHour,
                    sunsetHour
                )
            },
            {
                name: "Levrek",
                emoji: "🐠",
                score: calculateFishScore(
                    "levrek",
                    weather,
                    hour,
                    sunriseHour,
                    sunsetHour
                )
            }
        ];

        fishList.sort((a, b) => b.score - a.score);

        days[dayKey].push({
            hour: hour,
            temperature: weather.temperature,
            fish: fishList[0]
        });
    }

    // Her günün en iyi saatini bul
    Object.keys(days).slice(0, 7).forEach(dayKey => {

        const hours = days[dayKey];

        if (hours.length === 0) return;

        hours.sort((a, b) => b.fish.score - a.fish.score);

        const best = hours[0];

        const date = new Date(dayKey + "T12:00:00");

        const dayName = date.toLocaleDateString("tr-TR", {
            weekday: "long",
            day: "numeric",
            month: "long"
        });

        weeklyCards.innerHTML += `
            <div class="weekly-card">

                <div class="weekly-date">
                    📅 ${dayName}
                </div>

                <div class="weekly-fish">
                    ${best.fish.emoji}
                    <strong>${best.fish.name}</strong>
                    <span>%${best.fish.score}</span>
                </div>

                <div class="weekly-info">
                    ⏰ En iyi saat:
                    <strong>
                        ${String(best.hour).padStart(2, "0")}:00
                    </strong>
                </div>

                <div class="weekly-info">
                    🌡️ ${best.temperature.toFixed(1)} °C
                </div>

            </div>
        `;
    });
}
 async function showFavoriteSpots() {

    const container = document.getElementById("favoriteSpots");

    if (!container) return;

    const spots =
        JSON.parse(localStorage.getItem("fishingSpots")) || [];
const favoriteCount = document.getElementById("favoriteCount");

if (favoriteCount) {
    favoriteCount.innerText = spots.length;
}
    if (spots.length === 0) {
        container.innerHTML = `
            <div class="empty-favorites">
                <div class="empty-icon">🎣</div>
                <h3>Henüz favori yerin yok</h3>
                <p>Haritadan sevdiğin av noktalarını kaydedebilirsin.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `<p>🌦️ Favori yerlerin hava durumu yükleniyor...</p>`;

    let cards = "";

    for (let index = 0; index < spots.length; index++) {

        const spot = spots[index];

        try {

            const url =
                `https://api.open-meteo.com/v1/forecast` +
                `?latitude=${spot.latitude}` +
                `&longitude=${spot.longitude}` +
                `&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,precipitation_probability,pressure_msl,cloud_cover` +
                `&forecast_days=1` +
                `&timezone=auto`;

            const response = await fetch(url);
            const data = await response.json();

            const now = new Date();

            let currentIndex = data.hourly.time.findIndex(time =>
                new Date(time).getHours() === now.getHours()
            );

            if (currentIndex === -1) currentIndex = 0;

            const temp =
                data.hourly.temperature_2m[currentIndex];

            const wind =
                data.hourly.wind_speed_10m[currentIndex];

            const windDegree =
                data.hourly.wind_direction_10m[currentIndex];

            const rain =
                data.hourly.precipitation_probability[currentIndex];

            const pressure =
                data.hourly.pressure_msl[currentIndex];

            const cloud =
                data.hourly.cloud_cover[currentIndex];


            // 🎣 AV PUANI HESAPLAMA
            let score = 50;

            if (temp >= 15 && temp <= 28) score += 10;
            else if (temp < 8 || temp > 34) score -= 15;

            if (wind >= 3 && wind <= 18) score += 10;
            else if (wind > 30) score -= 20;

            if (pressure >= 1005 && pressure <= 1020) score += 10;

            if (rain <= 20) score += 5;
            else if (rain > 70) score -= 15;

            if (cloud >= 20 && cloud <= 80) score += 5;


            // 5 ÜZERİNDEN PUAN
            let rating;
            let ratingText;
            let ratingIcon;

            if (score < 40) {
                rating = 1;
                ratingText = "Çok Kötü";
                ratingIcon = "🔴";
            }
            else if (score < 50) {
                rating = 2;
                ratingText = "Kötü";
                ratingIcon = "🟠";
            }
            else if (score < 65) {
                rating = 3;
                ratingText = "Orta";
                ratingIcon = "🟡";
            }
            else if (score < 80) {
                rating = 4;
                ratingText = "İyi";
                ratingIcon = "🟢";
            }
            else {
                rating = 5;
                ratingText = "Çok İyi";
                ratingIcon = "🟢";
            }


            cards += `
                <div class="favorite-card">

                    <div class="favorite-top">

                        <div>
                            <span class="favorite-number">
                                #${index + 1}
                            </span>

                            <h3>⭐ ${spot.name}</h3>
                        </div>

                        <button
                            class="delete-favorite"
                            onclick="deleteFishingSpot(${index})">
                            🗑️
                        </button>

                    </div>

                    <p class="favorite-location">
                        📍 ${spot.latitude.toFixed(4)},
                        ${spot.longitude.toFixed(4)}
                    </p>

                    <div class="favorite-weather">

                        <p>🌡️ ${temp} °C</p>

                        <p>💨 ${wind} km/s</p>

                        <p>
                            🧭 ${getWindDirection(windDegree)}
                        </p>

                        <p>🌧️ %${rain}</p>

                        <p>🎈 ${pressure} hPa</p>

                    </div>

                    <div class="favorite-rating">
                        🎣 Bugünkü Av Durumu:
                        <strong>
                            ${ratingIcon} ${rating}/5 ${ratingText}
                        </strong>
                    </div>
<div class="favorite-best-fish">
    🐟 Şu an en uygun balık:
    <strong>
        ${bestFish.emoji} ${bestFish.name} %${bestFish.score}
    </strong>
</div>
                    <div class="favorite-actions">

                        <button onclick="
                            showSpotOnMap(
                                ${spot.latitude},
                                ${spot.longitude}
                            )
                        ">
                            🗺️ Haritada Göster
                        </button>

                    </div>

                </div>
            `;

        } catch (error) {

            cards += `
    <div class="favorite-card">

        <div class="favorite-top">

            <div>
                <h3>⭐ ${spot.name}</h3>
            </div>

            <button
                class="delete-favorite"
                onclick="deleteFishingSpot(${index})">
                🗑️
            </button>

        </div>

        <p>
            📍 ${spot.latitude.toFixed(4)},
            ${spot.longitude.toFixed(4)}
        </p>

        <p>⚠️ Hava bilgisi alınamadı.</p>

    </div>
`;
        }
    }

    container.innerHTML = cards;
}
function deleteFishingSpot(index) {

    const spots =
        JSON.parse(localStorage.getItem("fishingSpots")) || [];

    spots.splice(index, 1);

    localStorage.setItem(
        "fishingSpots",
        JSON.stringify(spots)
    );

    showFavoriteSpots();
}
function showSpotOnMap(latitude, longitude) {

    showPage("forecast");

    openMap();

    setTimeout(function() {

        map.setView(
            [latitude, longitude],
            14
        );

        if (mapMarker) {
            mapMarker.setLatLng(
                [latitude, longitude]
            );
        } else {
            mapMarker = L.marker(
                [latitude, longitude]
            ).addTo(map);
        }

        getWeather(latitude, longitude);

    }, 200);
}
function feedSans() {

    const lastFeeding = document.getElementById("lastFeeding");
    const fishMood = document.getElementById("fishMood");

    const now = new Date();

    const timeText = now.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit"
    });

    lastFeeding.innerText = "Bugün " + timeText;
    fishMood.innerText = "Çok mutlu 💙";

    localStorage.setItem("sansLastFeeding", timeText);

    createFoodEffect();
}
function createFoodEffect() {

    const aquarium = document.querySelector(".sans-card");

    for (let i = 0; i < 8; i++) {

        const food = document.createElement("span");

        food.innerText = "•";
        food.className = "fish-food";

        food.style.left =
            Math.random() * 80 + 10 + "%";

        food.style.animationDelay =
            Math.random() * 0.5 + "s";

        aquarium.appendChild(food);

        setTimeout(function() {
            food.remove();
        }, 2500);
    }
}
function loadSansData() {

    const savedFeeding =
        localStorage.getItem("sansLastFeeding");

    if (savedFeeding) {

        document.getElementById("lastFeeding").innerText =
            "Bugün " + savedFeeding;

    }
}
loadSansData();
function swimSans() {

    const fish = document.getElementById("sansFish");

    if (!fish) return;

    const newLeft = Math.random() * 75 + 5;
    const newTop = Math.random() * 65 + 10;

    const currentLeft =
        parseFloat(fish.style.left || 10);

    if (newLeft < currentLeft) {
        fish.style.transform = "scaleX(-1)";
    } else {
        fish.style.transform = "scaleX(1)";
    }

    fish.style.left = newLeft + "%";
    fish.style.top = newTop + "%";
}

function swimSans() {
    const fish = document.getElementById("sansFish");
    const tank = document.querySelector(".tank-scene");

    if (!fish || !tank) return;

    // Akvaryumun içinde rastgele hedef
    const maxX = tank.clientWidth - fish.offsetWidth - 30;
    const maxY = tank.clientHeight - fish.offsetHeight - 30;

    const newX = Math.max(20, Math.random() * maxX);
    const newY = Math.max(20, Math.random() * maxY);

    const currentX = parseFloat(fish.dataset.x || 0);

    // Gideceği yöne doğru dön
    if (newX < currentX) {
        fish.style.transform = "scaleX(-1)";
    } else {
        fish.style.transform = "scaleX(1)";
    }

    fish.style.left = newX + "px";
    fish.style.top = newY + "px";

    fish.dataset.x = newX;
}

// İlk hareket
setTimeout(swimSans, 500);

// Sonra sürekli yüz
setInterval(swimSans, 3000);
function cleanTank() {
    const tank = document.querySelector(".tank-scene");
    const tankStatus = document.getElementById("tankStatus");

    if (!tank || !tankStatus) return;

    tankStatus.innerText = "Temizleniyor... 🫧";
    tank.classList.add("cleaning");

    setTimeout(function() {

        tank.classList.remove("cleaning");

        const now = new Date();
localStorage.setItem(
    "sansLastCleaningDate",
    now.toISOString()
);
updateTankCleanliness();
        const cleanTime = now.toLocaleString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });

        tankStatus.innerText =
            "Son temizlik: " + cleanTime;

        localStorage.setItem(
            "sansLastCleaning",
            cleanTime
        );

    }, 2200);
}
function loadTankCleaning() {
    const tankStatus = document.getElementById("tankStatus");
    const savedCleaning =
        localStorage.getItem("sansLastCleaning");

    if (!tankStatus) return;

    if (savedCleaning) {
        tankStatus.innerText =
            "Son temizlik: " + savedCleaning;
    } else {
        tankStatus.innerText =
            "Henüz temizlenmedi";
    }
}

loadTankCleaning();
function updateTankCleanliness() {

    const algae = document.getElementById("algaeLayer");
    const tankStatus = document.getElementById("tankStatus");

    if (!algae || !tankStatus) return;

    algae.classList.remove(
        "algae-light",
        "algae-medium",
        "algae-heavy"
    );

    const savedCleaning =
        localStorage.getItem("sansLastCleaningDate");

    if (!savedCleaning) {
        tankStatus.innerText = "🫧 Temizlik bekliyor";
        algae.classList.add("algae-medium");
        return;
    }

    const lastCleaning = new Date(savedCleaning);
    const now = new Date();

    const daysPassed = Math.floor(
        (now - lastCleaning) / (1000 * 60 * 60 * 24)
    );

    if (daysPassed <= 1) {
        tankStatus.innerText = "✨ Tertemiz";
    }

    else if (daysPassed <= 3) {
        tankStatus.innerText = "🟢 Hafif yosun";
        algae.classList.add("algae-light");
    }

    else if (daysPassed <= 6) {
        tankStatus.innerText = "🟢 Yosunlanıyor";
        algae.classList.add("algae-medium");
    }

    else {
        tankStatus.innerText = "🤢 Temizlik zamanı!";
        algae.classList.add("algae-heavy");
    }
}
function updateTankCleanliness() {

    const algae = document.getElementById("algaeLayer");
    const tankStatus = document.getElementById("tankStatus");

    if (!algae || !tankStatus) return;

    algae.classList.remove(
        "algae-light",
        "algae-medium",
        "algae-heavy"
    );

    const savedCleaning =
        localStorage.getItem("sansLastCleaningDate");

    if (!savedCleaning) {
        tankStatus.innerText = "🫧 Henüz temizlenmedi";
        algae.classList.add("algae-medium");
        return;
    }

    const lastCleaning = new Date(savedCleaning);
    const now = new Date();

    const daysPassed = Math.floor(
        (now - lastCleaning) / (1000 * 60 * 60 * 24)
    );

    if (daysPassed <= 1) {
        tankStatus.innerText = "✨ Tertemiz";
    } else if (daysPassed <= 3) {
        tankStatus.innerText = "🟢 Hafif yosun";
        algae.classList.add("algae-light");
    } else if (daysPassed <= 6) {
        tankStatus.innerText = "🌿 Yosunlanıyor";
        algae.classList.add("algae-medium");
    } else {
        tankStatus.innerText = "🤢 Temizlik zamanı!";
        algae.classList.add("algae-heavy");
    }
}
updateTankCleanliness();
function saveCatch() {
const photoInput = document.getElementById("catchPhoto");
const photo =
    photoInput && photoInput.files[0]
        ? catchPhotoPreview.src
        : null;
    const fish = document.getElementById("catchFish").value.trim();
    const weight = document.getElementById("catchWeight").value;
    const length = document.getElementById("catchLength").value;
    const location = document.getElementById("catchLocation").value.trim();
    const date = document.getElementById("catchDate").value;
    const note = document.getElementById("catchNote").value.trim();

    if (!fish) {
        alert("Önce balık türünü yaz 🎣");
        return;
    }

    const catches =
        JSON.parse(localStorage.getItem("erosariumCatches")) || [];

    const newCatch = {
    id: Date.now(),
    photo: photo,
    fish: fish,
        weight: weight ? Number(weight) : null,
        length: length ? Number(length) : null,
        location: location,
        date: date || new Date().toISOString(),
        note: note
    };

    catches.push(newCatch);

    localStorage.setItem(
        "erosariumCatches",
        JSON.stringify(catches)
    );

    document.getElementById("catchFish").value = "";
    document.getElementById("catchWeight").value = "";
    document.getElementById("catchLength").value = "";
    document.getElementById("catchLocation").value = "";
    document.getElementById("catchDate").value = "";
    document.getElementById("catchNote").value = "";
document.getElementById("catchPhoto").value = "";
catchPhotoPreview.src = "";
catchPhotoPreview.style.display = "none";
    showCatches();

    alert("🎣 Av günlüğüne eklendi!");
}
function showCatches() {

    const catchList = document.getElementById("catchList");
    const catchStats = document.getElementById("catchStats");

    if (!catchList || !catchStats) return;

    const catches =
        JSON.parse(localStorage.getItem("erosariumCatches")) || [];

    if (catches.length === 0) {
        catchStats.innerHTML = "";
        catchList.innerHTML = `
            <div class="empty-catches">
                <div>🎣</div>
                <h3>Henüz kayıtlı av yok</h3>
                <p>İlk avını eklediğinde burada görünecek.</p>
            </div>
        `;
        return;
    }

    const heaviest = catches
        .filter(item => item.weight)
        .sort((a, b) => b.weight - a.weight)[0];

    const longest = catches
        .filter(item => item.length)
        .sort((a, b) => b.length - a.length)[0];

    catchStats.innerHTML = `
        <div class="catch-stats">
            <div>
                <strong>${catches.length}</strong>
                <span>🎣 Toplam Av</span>
            </div>

            <div>
                <strong>
                    ${heaviest ? heaviest.weight + " kg" : "-"}
                </strong>
                <span>⚖️ En Ağır</span>
            </div>

            <div>
                <strong>
                    ${longest ? longest.length + " cm" : "-"}
                </strong>
                <span>📏 En Uzun</span>
            </div>
        </div>
    `;

    const sortedCatches = [...catches].reverse();

    catchList.innerHTML = sortedCatches.map(function(item) {

        const originalIndex =
            catches.findIndex(catchItem => catchItem.id === item.id);

        const dateText = new Date(item.date).toLocaleString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });

        const isHeaviest =
            heaviest && item.id === heaviest.id;

        const isLongest =
            longest && item.id === longest.id;

        return `
            <div class="catch-card">
${
    item.photo
        ? `
            <img
                src="${item.photo}"
                class="catch-card-photo"
                alt="${item.fish}"
            >
        `
        : ""
}
                <div class="catch-card-top">

                    <div>
                        <h3>🐟 ${item.fish}</h3>

                        ${
                            isHeaviest
                                ? `<span class="record-badge">🏆 En Ağır</span>`
                                : ""
                        }

                        ${
                            isLongest
                                ? `<span class="record-badge">📏 En Uzun</span>`
                                : ""
                        }
                    </div>

                    <button
                        class="delete-catch"
                        onclick="deleteCatch(${originalIndex})">
                        🗑️
                    </button>

                </div>

                <div class="catch-details">

                    ${
                        item.weight
                            ? `<p>⚖️ ${item.weight} kg</p>`
                            : ""
                    }

                    ${
                        item.length
                            ? `<p>📏 ${item.length} cm</p>`
                            : ""
                    }

                    ${
                        item.location
                            ? `<p>📍 ${item.location}</p>`
                            : ""
                    }

                    <p>🕐 ${dateText}</p>

                </div>

                ${
                    item.note
                        ? `<p class="catch-note">“${item.note}”</p>`
                        : ""
                }

            </div>
        `;

    }).join("");
}
function deleteCatch(index) {

    const catches =
        JSON.parse(localStorage.getItem("erosariumCatches")) || [];

    const confirmed =
        confirm("Bu av kaydını silmek istediğine emin misin?");

    if (!confirmed) return;

    catches.splice(index, 1);

    localStorage.setItem(
        "erosariumCatches",
        JSON.stringify(catches)
    );

    showCatches();
}
showCatches();
const catchPhotoInput = document.getElementById("catchPhoto");
const catchPhotoPreview = document.getElementById("catchPhotoPreview");

if (catchPhotoInput && catchPhotoPreview) {
    catchPhotoInput.addEventListener("change", function () {
        const file = this.files[0];

        if (!file) {
            catchPhotoPreview.src = "";
            catchPhotoPreview.style.display = "none";
            return;
        }

        const reader = new FileReader();

        reader.onload = function (event) {
            catchPhotoPreview.src = event.target.result;
            catchPhotoPreview.style.display = "block";
        };

        reader.readAsDataURL(file);
    });
}
const fishGuideData = {

    izmir: [

        {
            emoji: "🐠",
            name: "Levrek",
            latin: "Dicentrarchus labrax",
            habitat: "Kıyılar, kayalık bölgeler, lagün ve nehir ağızları",
            hours: "05:00–08:00 / 18:00–22:00",
            bait: "Küçük balık, karides, silikon yem",
            info: "Avcı bir balıktır. Sabah ve akşam saatlerini sevmesiyle bilinir."
        },

        {
            emoji: "🐟",
            name: "Çipura",
            latin: "Sparus aurata",
            habitat: "Kumluk, taşlık ve deniz çayırı bölgeleri",
            hours: "06:00–10:00 / 17:00–21:00",
            bait: "Karides, mamun, midye, boru kurdu",
            info: "Güçlü çenesiyle kabukluları kırabilir."
        },

        {
            emoji: "🐟",
            name: "Karagöz",
            latin: "Diplodus vulgaris",
            habitat: "Kayalık ve taşlık kıyılar",
            hours: "06:00–09:00 / 18:00–22:00",
            bait: "Karides, midye, mamun",
            info: "Kayalık bölgelerde sık karşılaşılan kıyı balıklarından biridir."
        },

        {
            emoji: "🐟",
            name: "Kefal",
            latin: "Mugil cephalus",
            habitat: "Liman, kıyı, lagün ve nehir ağızları",
            hours: "07:00–11:00 / 16:00–20:00",
            bait: "Ekmek, hamur, kurt",
            info: "Hem tuzlu hem de acı su ortamlarında görülebilir."
        },

        {
            emoji: "🐟",
            name: "Mırmır",
            latin: "Lithognathus mormyrus",
            habitat: "Kumluk kıyılar ve sığ bölgeler",
            hours: "18:00–23:00",
            bait: "Mamun, boru kurdu, karides",
            info: "Özellikle kumluk zeminde yem arar."
        },

        {
            emoji: "🐟",
            name: "Lüfer",
            latin: "Pomatomus saltatrix",
            habitat: "Kıyı ve açık su bölgeleri",
            hours: "06:00–09:00 / 18:00–22:00",
            bait: "Sardalya, zargana, kaşık ve sahte yem",
            info: "Hızlı ve saldırgan bir avcıdır."
        }

    ],

    manisa: [

        {
            emoji: "🐟",
            name: "Sazan",
            latin: "Cyprinus carpio",
            habitat: "Baraj gölleri, göller ve yavaş akan sular",
            hours: "05:00–10:00 / 17:00–21:00",
            bait: "Mısır, hamur, solucan, boilie",
            info: "Dipte beslenen güçlü bir tatlı su balığıdır."
        },

        {
            emoji: "🐟",
            name: "Sudak",
            latin: "Sander lucioperca",
            habitat: "Baraj gölleri ve derin tatlı sular",
            hours: "04:00–08:00 / 18:00–23:00",
            bait: "Silikon, küçük balık ve sahte yem",
            info: "Düşük ışık koşullarında aktif olabilen yırtıcı bir türdür."
        },

        {
            emoji: "🐋",
            name: "Yayın",
            latin: "Silurus glanis",
            habitat: "Derin ve sakin tatlı sular",
            hours: "20:00–04:00",
            bait: "Solucan, balık ve etli yemler",
            info: "Büyük boylara ulaşabilen güçlü bir tatlı su avcısıdır."
        },

        {
            emoji: "🐟",
            name: "Gümüşi Havuz Balığı",
            latin: "Carassius gibelio",
            habitat: "Göl, baraj ve yavaş akan sular",
            hours: "06:00–11:00 / 16:00–20:00",
            bait: "Hamur, mısır, solucan",
            info: "Farklı çevre koşullarına oldukça dayanıklı bir türdür."
        },

        {
            emoji: "🐟",
            name: "Eğrez",
            latin: "Vimba vimba",
            habitat: "Göl ve bağlantılı tatlı su sistemleri",
            hours: "06:00–10:00 / 16:00–20:00",
            bait: "Kurt ve küçük doğal yemler",
            info: "Manisa bölgesindeki iç sularda kayıt altına alınmış türlerden biridir."
        }

    ]
};


function showFishCity(city, button) {

    const container =
        document.getElementById("fishGuideList");

    if (!container) return;

    document
        .querySelectorAll(".fish-city")
        .forEach(btn => btn.classList.remove("active"));

    if (button) {
        button.classList.add("active");
    }

    const fishes = fishGuideData[city];

    container.innerHTML = fishes.map(fish => `

        <div class="fish-guide-card">

            <div class="fish-guide-head">

                <div class="fish-guide-emoji">
                    ${fish.emoji}
                </div>

                <div>
                    <h3>${fish.name}</h3>
                    <small>${fish.latin}</small>
                </div>

            </div>

            <div class="fish-guide-info">

                <div>
                    <span>📍 Yaşam Alanı</span>
                    <strong>${fish.habitat}</strong>
                </div>

                <div class="active-hours">
                    <span>⏰ Genel Aktif Saat</span>
                    <strong>${fish.hours}</strong>
                </div>

                <div>
                    <span>🪱 Yem</span>
                    <strong>${fish.bait}</strong>
                </div>

            </div>

            <p class="fish-description">
                💡 ${fish.info}
            </p>

        </div>

    `).join("");
}
showFishCity("izmir");
const nisaMessages = [
    "Balıklar kaçsa da ben buradayım. 🎣🤍",
    "Bugün şansın oltanın ucunda olsun. ⭐",
    "Deniz sakin, kafa rahat, av bol olsun. 🌊",
    "Eve güzel bir hikâyeyle dön yeter. ❤️",
    "En büyük balığı tutamasan da en güzel günü geçir. 🎣",
    "Rüzgâr arkandan, şans yanında olsun. 🍀",
    "Şans sana uğur getirsin. 🐠💙",
    "Kendine dikkat et, gerisi hallolur. 🤍"
];

function changeNisaMessage() {
    const message = document.getElementById("nisaMessage");

    if (!message) return;

    const randomIndex =
        Math.floor(Math.random() * nisaMessages.length);

    message.innerText =
        nisaMessages[randomIndex];
}
const sansMessages = [
    "Babacım bugün akvaryumu temizlemeyi unutma 🐠",
    "Ben yeme doydum, şimdi sıra senin avında 🎣",
    "Bugün büyük balık geliyor, hissediyorum 👀",
    "Beni beslemeden ava çıkmak yok 🍤",
    "Nisu seni seviyor, ben de yemi seviyorum 💙",
    "Av boş geçerse suçu rüzgâra at, ben bir şey görmedim 😌",
    "Bugün oltaya değil şansa güven 🍀",
    "Benim yüzgeçler diyor ki akşamüstü çık 🎣",
    "Babacım sakin ol, balık senden daha sabırlı olabilir 🐟",
    "Eve gelirken benim yemimi unutma 😭",
    "Büyük balığı tutarsan fotoğrafını bana da göster 🐠",
    "Bugün şansın açık. İsmim boşuna Şans değil ⭐",
    "Akvaryum temiz, ben mutluyum, sıra sende 💙",
    "Nisu'dan mesaj varmış gibi hissediyorum... 👀❤️",
    "Balık tutamazsan gel benimle ilgilen, ben buradayım 🫧"
];

function getSansMessage() {
    const bubble = document.getElementById("sansMessageBubble");

    if (!bubble) return;

    const randomIndex =
        Math.floor(Math.random() * sansMessages.length);

    bubble.classList.remove("sans-pop");

    void bubble.offsetWidth;

    bubble.innerText =
        sansMessages[randomIndex];

    bubble.classList.add("sans-pop");
}
function updateLoveCounter() {

    const startDate = new Date(2026, 7, 14, 0, 0, 0);
    const now = new Date();

    let difference = now - startDate;

    if (difference < 0) difference = 0;

    const days = Math.floor(
        difference / (1000 * 60 * 60 * 24)
    );

    const hours = Math.floor(
        (difference / (1000 * 60 * 60)) % 24
    );

    const minutes = Math.floor(
        (difference / (1000 * 60)) % 60
    );

    const seconds = Math.floor(
        (difference / 1000) % 60
    );

    const daysElement = document.getElementById("loveDays");
    const hoursElement = document.getElementById("loveHours");
    const minutesElement = document.getElementById("loveMinutes");
    const secondsElement = document.getElementById("loveSeconds");

    if (!daysElement) return;

    daysElement.innerText = days;
    hoursElement.innerText = hours;
    minutesElement.innerText = minutes;
    secondsElement.innerText = seconds;
}

updateLoveCounter();

setInterval(updateLoveCounter, 1000);
if ("serviceWorker" in navigator) {

    window.addEventListener("load", () => {

        navigator.serviceWorker
            .register("./service-worker.js")
            .then(() => {
                console.log("Erosarium uygulaması hazır 🐠");
            })
            .catch(error => {
                console.error("Service Worker hatası:", error);
            });

    });

}

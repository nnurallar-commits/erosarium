import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getAuth,
    signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    deleteDoc,
    doc,
    onSnapshot,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


/* =========================================
   FIREBASE
========================================= */

const firebaseConfig = {
    apiKey: "AIzaSyCcU1SMTkr18Fo2FcJ_m7HGydMgbSJpQFs",
    authDomain: "erosarium.firebaseapp.com",
    projectId: "erosarium",
    storageBucket: "erosarium.firebasestorage.app",
    messagingSenderId: "1041155718188",
    appId: "1:1041155718188:web:b2473f8a91c834484e2589"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

let firebaseReady = false;

try {
    await signInAnonymously(auth);
    firebaseReady = true;
    console.log("☁️ Erosarium Firebase hazır.");
} catch (error) {
    console.error("Firebase bağlantı hatası:", error);
}


/* =========================================
   YARDIMCI
========================================= */

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatHour(date) {
    return String(date.getHours()).padStart(2, "0") + ":00";
}

function getWindDirection(degree) {
    if (degree === null || degree === undefined) return "-";

    const directions = [
        "K ↑",
        "KD ↗",
        "D →",
        "GD ↘",
        "G ↓",
        "GB ↙",
        "B ←",
        "KB ↖"
    ];

    return directions[Math.round(degree / 45) % 8];
}


/* =========================================
   SAYFALAR
========================================= */

function showPage(pageId) {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    const page = document.getElementById(pageId);

    if (page) {
        page.classList.add("active");
    }

    if (pageId === "favorites") {
        startFavoritesListener();
    }

    if (pageId === "catches") {
        startCatchesListener();
    }

    if (pageId === "aquarium") {
        startAquariumListener();
    }

    if (pageId === "fishguide") {
        showFishCity("izmir");
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

document.querySelectorAll("[data-page]").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.page);
    });
});


/* =========================================
   HARİTA
========================================= */

let map = null;
let mapMarker = null;

let selectedLatitude = null;
let selectedLongitude = null;

const useLocationBtn =
    document.getElementById("useLocationBtn");

const openMapBtn =
    document.getElementById("openMapBtn");

const saveSpotButton =
    document.getElementById("saveSpotButton");

useLocationBtn?.addEventListener("click", getLocation);
openMapBtn?.addEventListener("click", openMap);
saveSpotButton?.addEventListener("click", saveFishingSpot);


function getLocation() {
    const locationText =
        document.getElementById("locationText");

    if (!navigator.geolocation) {
        locationText.textContent =
            "Bu cihaz konum özelliğini desteklemiyor.";
        return;
    }

    locationText.textContent =
        "📍 Konum aranıyor...";

    navigator.geolocation.getCurrentPosition(
        position => {
            selectedLatitude =
                position.coords.latitude;

            selectedLongitude =
                position.coords.longitude;

            locationText.innerHTML = `
                ✅ Konum bulundu<br>
                ${selectedLatitude.toFixed(4)},
                ${selectedLongitude.toFixed(4)}
            `;

            getWeather(
                selectedLatitude,
                selectedLongitude
            );
        },

        error => {
            console.error(error);

            locationText.textContent =
                "❌ Konum alınamadı. Konum iznini kontrol et.";
        },

        {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 60000
        }
    );
}


function openMap() {
    const mapContainer =
        document.getElementById("mapContainer");

    mapContainer.classList.remove("hidden");

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
                    "&copy; OpenStreetMap contributors"
            }
        ).addTo(map);

        map.on("click", event => {
            selectedLatitude =
                event.latlng.lat;

            selectedLongitude =
                event.latlng.lng;

            saveSpotButton.classList.remove("hidden");

            if (mapMarker) {
                mapMarker.setLatLng([
                    selectedLatitude,
                    selectedLongitude
                ]);
            } else {
                mapMarker = L.marker([
                    selectedLatitude,
                    selectedLongitude
                ]).addTo(map);
            }

            document.getElementById(
                "selectedLocation"
            ).innerHTML = `
                📌 Seçilen konum:<br>
                ${selectedLatitude.toFixed(5)},
                ${selectedLongitude.toFixed(5)}
            `;

            getWeather(
                selectedLatitude,
                selectedLongitude
            );
        });
    }

    setTimeout(() => {
        map.invalidateSize();
    }, 200);
}


/* =========================================
   OPEN METEO
========================================= */

async function fetchWeather(latitude, longitude) {
    const params = new URLSearchParams({
        latitude,
        longitude,

        hourly: [
            "temperature_2m",
            "relative_humidity_2m",
            "precipitation_probability",
            "pressure_msl",
            "cloud_cover",
            "wind_speed_10m",
            "wind_gusts_10m",
            "wind_direction_10m"
        ].join(","),

        daily: [
            "sunrise",
            "sunset"
        ].join(","),

        timezone: "auto",
        forecast_days: "7"
    });

    const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?${params}`
    );

    if (!response.ok) {
        throw new Error("Hava API hatası");
    }

    return response.json();
}


/* =========================================
   AV SKORU
========================================= */

function calculateFishingScore({
    temperature,
    wind,
    rain,
    pressure,
    cloud,
    hour,
    sunriseHour,
    sunsetHour
}) {
    let score = 50;

    if (temperature >= 15 && temperature <= 28) {
        score += 12;
    } else if (temperature < 8 || temperature > 34) {
        score -= 15;
    }

    if (wind >= 3 && wind <= 18) {
        score += 12;
    } else if (wind > 30) {
        score -= 22;
    }

    if (rain <= 20) {
        score += 7;
    } else if (rain >= 70) {
        score -= 15;
    }

    if (pressure >= 1005 && pressure <= 1020) {
        score += 8;
    }

    if (cloud >= 20 && cloud <= 80) {
        score += 5;
    }

    if (
        Math.abs(hour - sunriseHour) <= 2 ||
        Math.abs(hour - sunsetHour) <= 2
    ) {
        score += 12;
    }

    return Math.max(
        0,
        Math.min(100, Math.round(score))
    );
}


function getScoreLevel(score) {
    if (score >= 80) {
        return {
            text: "Çok İyi",
            icon: "🟢",
            className: "very-good"
        };
    }

    if (score >= 65) {
        return {
            text: "İyi",
            icon: "🟢",
            className: "good"
        };
    }

    if (score >= 50) {
        return {
            text: "Orta",
            icon: "🟡",
            className: "medium"
        };
    }

    return {
        text: "Zayıf",
        icon: "🔴",
        className: "poor"
    };
}


/* =========================================
   SAATLİK SKORLAR
========================================= */

function buildHourlyScores(data) {
    const results = [];

    data.hourly.time.forEach((time, index) => {
        const date = new Date(time);

        const dayKey =
            time.split("T")[0];

        const dailyIndex =
            data.daily.time.indexOf(dayKey);

        if (dailyIndex === -1) return;

        const sunriseHour =
            new Date(
                data.daily.sunrise[dailyIndex]
            ).getHours();

        const sunsetHour =
            new Date(
                data.daily.sunset[dailyIndex]
            ).getHours();

        const score =
            calculateFishingScore({
                temperature:
                    data.hourly.temperature_2m[index],

                wind:
                    data.hourly.wind_speed_10m[index],

                rain:
                    data.hourly
                        .precipitation_probability[index],

                pressure:
                    data.hourly.pressure_msl[index],

                cloud:
                    data.hourly.cloud_cover[index],

                hour:
                    date.getHours(),

                sunriseHour,
                sunsetHour
            });

        results.push({
            index,
            date,
            score,
            level: getScoreLevel(score),

            temperature:
                data.hourly.temperature_2m[index],

            humidity:
                data.hourly.relative_humidity_2m[index],

            rain:
                data.hourly
                    .precipitation_probability[index],

            pressure:
                data.hourly.pressure_msl[index],

            cloud:
                data.hourly.cloud_cover[index],

            wind:
                data.hourly.wind_speed_10m[index],

            gust:
                data.hourly.wind_gusts_10m[index],

            direction:
                data.hourly.wind_direction_10m[index]
        });
    });

    return results;
}


/* =========================================
   ÖNÜMÜZDEKİ İDEAL AV SAATİ
========================================= */

function findNextIdealFishingTime(hourlyScores) {
    const now = new Date();

    const future =
        hourlyScores.filter(item => {
            return item.date.getTime() >=
                now.getTime() - 30 * 60 * 1000;
        });

    if (!future.length) return null;

    /*
      Erol'un istediği sıra:

      1. Önümüzde Çok İyi varsa
         en yakın Çok İyi saat.

      2. Yoksa İyi varsa
         en yakın İyi saat.

      3. O da yoksa gelecekteki
         en yüksek puanlı saat.
    */

    const veryGood =
        future.find(item =>
            item.score >= 80
        );

    if (veryGood) {
        return veryGood;
    }

    const good =
        future.find(item =>
            item.score >= 65
        );

    if (good) {
        return good;
    }

    return [...future].sort(
        (a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }

            return a.date - b.date;
        }
    )[0];
}


/* =========================================
   ANA HAVA EKRANI
========================================= */

async function getWeather(latitude, longitude) {
    const result =
        document.getElementById("forecastResult");

    result.innerHTML = `
        <div class="loading-card">
            🌦️ Hava ve av koşulları hesaplanıyor...
        </div>
    `;

    try {
        const data =
            await fetchWeather(
                latitude,
                longitude
            );

        const hourlyScores =
            buildHourlyScores(data);

        const now = new Date();

        const current =
            hourlyScores.reduce(
                (closest, item) => {
                    if (!closest) return item;

                    return Math.abs(
                        item.date - now
                    ) <
                    Math.abs(
                        closest.date - now
                    )
                        ? item
                        : closest;
                },
                null
            );

        const ideal =
            findNextIdealFishingTime(
                hourlyScores
            );

        result.innerHTML = `
            ${createCurrentWeatherHtml(current)}

            ${createNextIdealHtml(ideal)}

            ${createTodayHourlyHtml(hourlyScores)}
        `;

        createWeeklyForecast(hourlyScores);

    } catch (error) {
        console.error(error);

        result.innerHTML = `
            <div class="error-card">
                ❌ Hava bilgisi alınamadı.
                İnternet bağlantısını kontrol et.
            </div>
        `;
    }
}


function createCurrentWeatherHtml(item) {
    if (!item) return "";

    return `
        <div class="weather-card">

            <div class="weather-card-title">
                <div>
                    <span class="weather-big-icon">
                        🌦️
                    </span>

                    <div>
                        <small>ŞU AN</small>
                        <h3>Hava Durumu</h3>
                    </div>
                </div>

                <div class="current-temperature">
                    ${Math.round(item.temperature)}°
                </div>
            </div>

            <div class="weather-grid">

                <div class="weather-item">
                    <span>💨 Rüzgâr</span>
                    <strong>
                        ${Math.round(item.wind)} km/sa
                    </strong>
                </div>

                <div class="weather-item">
                    <span>🧭 Yön</span>
                    <strong>
                        ${getWindDirection(item.direction)}
                    </strong>
                </div>

                <div class="weather-item">
                    <span>🌧️ Yağmur</span>
                    <strong>
                        %${item.rain}
                    </strong>
                </div>

                <div class="weather-item">
                    <span>💧 Nem</span>
                    <strong>
                        %${item.humidity}
                    </strong>
                </div>

                <div class="weather-item">
                    <span>☁️ Bulut</span>
                    <strong>
                        %${item.cloud}
                    </strong>
                </div>

                <div class="weather-item">
                    <span>🎈 Basınç</span>
                    <strong>
                        ${Math.round(item.pressure)} hPa
                    </strong>
                </div>

            </div>

        </div>
    `;
}


/* =========================================
   İDEAL AV KARTI
========================================= */

function createNextIdealHtml(item) {
    if (!item) return "";

    const now =
        new Date();

    const sameDay =
        item.date.toDateString() ===
        now.toDateString();

    const tomorrow =
        item.date.toDateString() ===
        new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1
        ).toDateString();

    let dayText;

    if (sameDay) {
        dayText = "Bugün";
    } else if (tomorrow) {
        dayText = "Yarın";
    } else {
        dayText =
            item.date.toLocaleDateString(
                "tr-TR",
                {
                    weekday: "long",
                    day: "numeric",
                    month: "long"
                }
            );
    }

    return `
        <div class="ideal-fishing-card ${item.level.className}">

            <div class="ideal-label">
                🎣 ÖNÜMÜZDEKİ EN İDEAL AV SAATİ
            </div>

            <div class="ideal-main">

                <div>
                    <span class="ideal-status">
                        ${item.level.icon}
                        ${item.level.text}
                    </span>

                    <h2>
                        ${dayText}
                        •
                        ${formatHour(item.date)}
                    </h2>
                </div>

                <div class="ideal-score">
                    %${item.score}
                </div>

            </div>

            <div class="ideal-weather">

                <span>
                    🌡️ ${Math.round(item.temperature)}°C
                </span>

                <span>
                    💨 ${Math.round(item.wind)} km/sa
                </span>

                <span>
                    🌧️ %${item.rain}
                </span>

                <span>
                    🎈 ${Math.round(item.pressure)} hPa
                </span>

            </div>

        </div>
    `;
}


/* =========================================
   BUGÜN SAATLİK HAVA
========================================= */

function createTodayHourlyHtml(hourlyScores) {
    const now =
        new Date();

    const today =
        hourlyScores.filter(item =>
            item.date.getFullYear() ===
                now.getFullYear() &&

            item.date.getMonth() ===
                now.getMonth() &&

            item.date.getDate() ===
                now.getDate()
        );

    if (!today.length) return "";

    return `
        <div class="hourly-section">

            <div class="section-title-row">
                <div>
                    <small>BUGÜN</small>
                    <h2>🌦️ Gün İçinde Hava</h2>
                </div>

                <span>
                    Sağa kaydır →
                </span>
            </div>

            <div class="hourly-scroll">

                ${today.map(item => `
                    <div
                        class="hourly-weather-card
                        ${
                            item.date.getHours() ===
                            now.getHours()
                                ? "current-hour"
                                : ""
                        }"
                    >

                        <strong class="hourly-time">
                            ${formatHour(item.date)}
                        </strong>

                        <div class="hourly-temp">
                            ${getWeatherEmoji(item)}
                            ${Math.round(item.temperature)}°
                        </div>

                        <div>
                            💨 ${Math.round(item.wind)}
                        </div>

                        <div>
                            🌧️ %${item.rain}
                        </div>

                        <div class="hourly-score">
                            ${item.level.icon}
                            %${item.score}
                        </div>

                    </div>
                `).join("")}

            </div>

        </div>
    `;
}


function getWeatherEmoji(item) {
    if (item.rain >= 70) return "🌧️";
    if (item.rain >= 30) return "🌦️";
    if (item.cloud >= 70) return "☁️";
    if (item.cloud >= 30) return "🌤️";

    return "☀️";
}


/* =========================================
   7 GÜNLÜK
========================================= */

function createWeeklyForecast(hourlyScores) {
    const container =
        document.getElementById("weeklyCards");

    if (!container) return;

    const grouped = {};

    hourlyScores.forEach(item => {
        const key =
            `${item.date.getFullYear()}-` +
            `${item.date.getMonth()}-` +
            `${item.date.getDate()}`;

        if (!grouped[key]) {
            grouped[key] = [];
        }

        grouped[key].push(item);
    });

    container.innerHTML =
        Object.values(grouped)
            .slice(0, 7)
            .map(dayItems => {
                const best =
                    [...dayItems].sort(
                        (a, b) =>
                            b.score - a.score
                    )[0];

                const date =
                    dayItems[0].date;

                const dayName =
                    date.toLocaleDateString(
                        "tr-TR",
                        {
                            weekday: "long",
                            day: "numeric",
                            month: "short"
                        }
                    );

                return `
                    <div class="weekly-card">

                        <div>
                            <strong>
                                ${dayName}
                            </strong>

                            <span>
                                ${best.level.icon}
                                ${best.level.text}
                            </span>
                        </div>

                        <div class="weekly-score">
                            %${best.score}
                        </div>

                        <p>
                            ⏰ En iyi:
                            ${formatHour(best.date)}
                        </p>

                        <p>
                            🌡️ ${Math.round(best.temperature)}°C
                            •
                            💨 ${Math.round(best.wind)} km/sa
                        </p>

                    </div>
                `;
            })
            .join("");
}


/* =========================================
   FAVORİLER FIREBASE
========================================= */

let favoritesListenerStarted =
    false;


async function saveFishingSpot() {
    if (
        selectedLatitude === null ||
        selectedLongitude === null
    ) {
        alert(
            "Önce haritadan bir av noktası seç 🎣"
        );
        return;
    }

    if (!firebaseReady) {
        alert(
            "Bulut bağlantısı henüz hazır değil."
        );
        return;
    }

    const name =
        prompt(
            "⭐ Bu av noktasının adı:",
            "Favori Av Noktam"
        );

    if (!name?.trim()) return;

    const note =
        prompt(
            "📝 Bu yer hakkında not:",
            ""
        ) || "";

    try {
        await addDoc(
            collection(db, "favoriteSpots"),
            {
                name: name.trim(),
                note: note.trim(),

                latitude:
                    selectedLatitude,

                longitude:
                    selectedLongitude,

                createdAt:
                    Date.now()
            }
        );

        alert(
            "⭐ Favorilere kaydedildi. Artık iki telefonda da görünecek."
        );

    } catch (error) {
        console.error(error);

        alert(
            "Favori kaydedilemedi."
        );
    }
}


function startFavoritesListener() {
    if (
        favoritesListenerStarted ||
        !firebaseReady
    ) return;

    favoritesListenerStarted = true;

    onSnapshot(
        collection(db, "favoriteSpots"),

        snapshot => {
            const spots =
                snapshot.docs.map(document => ({
                    id: document.id,
                    ...document.data()
                }));

            spots.sort(
                (a, b) =>
                    (b.createdAt || 0) -
                    (a.createdAt || 0)
            );

            renderFavoriteSpots(spots);
        },

        error => {
            console.error(
                "Favori dinleme hatası:",
                error
            );
        }
    );
}


function renderFavoriteSpots(spots) {
    const container =
        document.getElementById("favoriteSpots");

    const count =
        document.getElementById("favoriteCount");

    if (!container) return;

    if (count) {
        count.textContent =
            spots.length;
    }

    if (!spots.length) {
        container.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    ⭐
                </div>

                <h3>
                    Henüz favori yer yok
                </h3>

                <p>
                    Haritadan bir av noktası seçip
                    favorilere ekleyebilirsin.
                </p>

            </div>
        `;

        return;
    }

    container.innerHTML =
        spots.map(spot => `
            <div class="favorite-card">

                <div class="favorite-card-top">

                    <div>

                        <span class="favorite-pin">
                            📍
                        </span>

                        <h3>
                            ${escapeHtml(spot.name)}
                        </h3>

                    </div>

                    <button
                        class="favorite-delete-button"
                        data-delete-favorite="${spot.id}"
                        aria-label="Favoriyi sil"
                    >
                        🗑️
                    </button>

                </div>

                ${
                    spot.note
                        ? `
                            <p class="favorite-note">
                                ${escapeHtml(spot.note)}
                            </p>
                        `
                        : ""
                }

                <div class="favorite-coordinates">
                    ${Number(spot.latitude).toFixed(4)},
                    ${Number(spot.longitude).toFixed(4)}
                </div>

                <div class="favorite-actions">

                    <button
                        class="favorite-detail-button"
                        data-favorite-detail="${spot.id}"
                    >
                        🔎 Detaylı Aç
                    </button>

                    <button
                        class="favorite-map-button"
                        data-favorite-map="${spot.id}"
                    >
                        🗺️ Haritada Göster
                    </button>

                </div>

            </div>
        `).join("");

    container
        .querySelectorAll(
            "[data-delete-favorite]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    deleteFavorite(
                        button.dataset
                            .deleteFavorite
                    );
                }
            );
        });

    container
        .querySelectorAll(
            "[data-favorite-detail]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const spot =
                        spots.find(
                            item =>
                                item.id ===
                                button.dataset
                                    .favoriteDetail
                        );

                    if (spot) {
                        openFavoriteDetail(spot);
                    }
                }
            );
        });

    container
        .querySelectorAll(
            "[data-favorite-map]"
        )
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const spot =
                        spots.find(
                            item =>
                                item.id ===
                                button.dataset
                                    .favoriteMap
                        );

                    if (spot) {
                        showFavoriteOnMap(spot);
                    }
                }
            );
        });
}


async function deleteFavorite(id) {
    const yes =
        confirm(
            "Bu favori av noktasını ortak listeden silmek istiyor musun?"
        );

    if (!yes) return;

    try {
        await deleteDoc(
            doc(db, "favoriteSpots", id)
        );
    } catch (error) {
        console.error(error);

        alert(
            "Favori silinemedi."
        );
    }
}


/* =========================================
   FAVORİ DETAYLI AÇ
========================================= */

const favoriteDetailModal =
    document.getElementById(
        "favoriteDetailModal"
    );

const favoriteDetailContent =
    document.getElementById(
        "favoriteDetailContent"
    );

const closeFavoriteDetailBtn =
    document.getElementById(
        "closeFavoriteDetailBtn"
    );


closeFavoriteDetailBtn?.addEventListener(
    "click",
    closeFavoriteDetail
);

favoriteDetailModal?.addEventListener(
    "click",
    event => {
        if (
            event.target ===
            favoriteDetailModal
        ) {
            closeFavoriteDetail();
        }
    }
);


function closeFavoriteDetail() {
    favoriteDetailModal
        ?.classList.add("hidden");
}


async function openFavoriteDetail(spot) {
    favoriteDetailModal.classList.remove("hidden");

    favoriteDetailContent.innerHTML = `
        <div class="favorite-detail-loading">
            🌦️
            <h3>
                ${escapeHtml(spot.name)}
            </h3>
            <p>
                Bu noktanın canlı koşulları hesaplanıyor...
            </p>
        </div>
    `;

    try {
        const data =
            await fetchWeather(
                spot.latitude,
                spot.longitude
            );

        const hourly =
            buildHourlyScores(data);

        const now =
            new Date();

        const current =
            hourly.reduce(
                (closest, item) => {
                    if (!closest) return item;

                    return Math.abs(
                        item.date - now
                    ) <
                    Math.abs(
                        closest.date - now
                    )
                        ? item
                        : closest;
                },
                null
            );

        const ideal =
            findNextIdealFishingTime(hourly);

        favoriteDetailContent.innerHTML = `
            <div class="favorite-detail-header">

                <span>
                    ⭐ Favori Av Noktası
                </span>

                <h2>
                    ${escapeHtml(spot.name)}
                </h2>

                ${
                    spot.note
                        ? `
                            <p>
                                ${escapeHtml(spot.note)}
                            </p>
                        `
                        : ""
                }

                <small>
                    📍
                    ${Number(spot.latitude).toFixed(5)},
                    ${Number(spot.longitude).toFixed(5)}
                </small>

            </div>

            ${
                current
                    ? `
                        <div class="favorite-live-weather">

                            <div>
                                <span>
                                    🌡️
                                </span>

                                <strong>
                                    ${Math.round(current.temperature)}°C
                                </strong>

                                <small>
                                    Sıcaklık
                                </small>
                            </div>

                            <div>
                                <span>
                                    💨
                                </span>

                                <strong>
                                    ${Math.round(current.wind)}
                                </strong>

                                <small>
                                    km/sa
                                </small>
                            </div>

                            <div>
                                <span>
                                    🌧️
                                </span>

                                <strong>
                                    %${current.rain}
                                </strong>

                                <small>
                                    Yağmur
                                </small>
                            </div>

                            <div>
                                <span>
                                    🎣
                                </span>

                                <strong>
                                    %${current.score}
                                </strong>

                                <small>
                                    Av
                                </small>
                            </div>

                        </div>
                    `
                    : ""
            }

            ${createNextIdealHtml(ideal)}

            <button
                id="detailShowMapBtn"
                class="detail-map-button"
            >
                🗺️ Bu Noktayı Haritada Aç
            </button>
        `;

        document.getElementById(
            "detailShowMapBtn"
        )?.addEventListener(
            "click",
            () => {
                closeFavoriteDetail();
                showFavoriteOnMap(spot);
            }
        );

    } catch (error) {
        console.error(error);

        favoriteDetailContent.innerHTML = `
            <div class="error-card">
                ❌ Bu konumun hava bilgisi şu anda alınamadı.
            </div>
        `;
    }
}


function showFavoriteOnMap(spot) {
    showPage("forecast");

    selectedLatitude =
        Number(spot.latitude);

    selectedLongitude =
        Number(spot.longitude);

    openMap();

    setTimeout(() => {
        map.setView(
            [
                selectedLatitude,
                selectedLongitude
            ],
            14
        );

        if (mapMarker) {
            mapMarker.setLatLng([
                selectedLatitude,
                selectedLongitude
            ]);
        } else {
            mapMarker = L.marker([
                selectedLatitude,
                selectedLongitude
            ]).addTo(map);
        }

        document.getElementById(
            "selectedLocation"
        ).innerHTML = `
            ⭐ ${escapeHtml(spot.name)}<br>
            ${selectedLatitude.toFixed(5)},
            ${selectedLongitude.toFixed(5)}
        `;

        saveSpotButton.classList.remove("hidden");

        getWeather(
            selectedLatitude,
            selectedLongitude
        );
    }, 250);
}


/* =========================================
   AV FOTOĞRAFI
========================================= */

const catchPhotoInput =
    document.getElementById("catchPhoto");

const catchPhotoPreview =
    document.getElementById("catchPhotoPreview");

let selectedCatchPhoto = null;


catchPhotoInput?.addEventListener(
    "change",
    async function () {
        const file =
            this.files?.[0];

        if (!file) {
            selectedCatchPhoto = null;

            catchPhotoPreview.style.display =
                "none";

            return;
        }

        try {
            selectedCatchPhoto =
                await compressImage(file);

            catchPhotoPreview.src =
                selectedCatchPhoto;

            catchPhotoPreview.style.display =
                "block";

        } catch (error) {
            console.error(error);

            alert(
                "Fotoğraf hazırlanamadı."
            );
        }
    }
);


/* =========================================
   ORTAK AV GÜNLÜĞÜ
========================================= */

document.getElementById(
    "saveCatchBtn"
)?.addEventListener(
    "click",
    saveCatch
);


async function saveCatch() {
    if (!firebaseReady) {
        alert(
            "Bulut bağlantısı henüz hazır değil."
        );
        return;
    }

    const fish =
        document.getElementById(
            "catchFish"
        ).value.trim();

    const weight =
        document.getElementById(
            "catchWeight"
        ).value;

    const length =
        document.getElementById(
            "catchLength"
        ).value;

    const location =
        document.getElementById(
            "catchLocation"
        ).value.trim();

    const date =
        document.getElementById(
            "catchDate"
        ).value;

    const note =
        document.getElementById(
            "catchNote"
        ).value.trim();

    if (!fish) {
        alert(
            "Balık türünü yaz 🎣"
        );
        return;
    }

    try {
        await addDoc(
            collection(db, "catches"),
            {
                fish,

                weight:
                    weight
                        ? Number(weight)
                        : null,

                length:
                    length
                        ? Number(length)
                        : null,

                location,

                date:
                    date ||
                    new Date().toISOString(),

                note,

                photo:
                    selectedCatchPhoto,

                createdAt:
                    Date.now()
            }
        );

        resetCatchForm();

        alert(
            "🎣 Av ortak günlüğe kaydedildi."
        );

    } catch (error) {
        console.error(error);

        alert(
            "Av kaydedilemedi."
        );
    }
}


function resetCatchForm() {
    [
        "catchFish",
        "catchWeight",
        "catchLength",
        "catchLocation",
        "catchDate",
        "catchNote"
    ].forEach(id => {
        document.getElementById(id).value =
            "";
    });

    if (catchPhotoInput) {
        catchPhotoInput.value = "";
    }

    if (catchPhotoPreview) {
        catchPhotoPreview.src = "";
        catchPhotoPreview.style.display =
            "none";
    }

    selectedCatchPhoto = null;
}


let catchesListenerStarted =
    false;


function startCatchesListener() {
    if (
        catchesListenerStarted ||
        !firebaseReady
    ) return;

    catchesListenerStarted = true;

    onSnapshot(
        collection(db, "catches"),

        snapshot => {
            const catches =
                snapshot.docs.map(document => ({
                    id: document.id,
                    ...document.data()
                }));

            catches.sort(
                (a, b) =>
                    (b.createdAt || 0) -
                    (a.createdAt || 0)
            );

            renderCatches(catches);
        },

        error => {
            console.error(
                "Av günlüğü:",
                error
            );
        }
    );
}


function renderCatches(catches) {
    const stats =
        document.getElementById("catchStats");

    const list =
        document.getElementById("catchList");

    if (!stats || !list) return;

    if (!catches.length) {
        stats.innerHTML = "";

        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    🎣
                </div>

                <h3>
                    Henüz kayıtlı av yok
                </h3>

                <p>
                    İlk av kaydedildiğinde iki telefonda da burada görünecek.
                </p>
            </div>
        `;

        return;
    }

    const heaviest =
        [...catches]
            .filter(item =>
                Number(item.weight) > 0
            )
            .sort(
                (a, b) =>
                    Number(b.weight) -
                    Number(a.weight)
            )[0];

    const longest =
        [...catches]
            .filter(item =>
                Number(item.length) > 0
            )
            .sort(
                (a, b) =>
                    Number(b.length) -
                    Number(a.length)
            )[0];

    stats.innerHTML = `
        <div class="catch-stats">

            <div>
                <strong>
                    ${catches.length}
                </strong>
                <span>
                    🎣 Toplam Av
                </span>
            </div>

            <div>
                <strong>
                    ${
                        heaviest
                            ? heaviest.weight + " kg"
                            : "-"
                    }
                </strong>
                <span>
                    ⚖️ En Ağır
                </span>
            </div>

            <div>
                <strong>
                    ${
                        longest
                            ? longest.length + " cm"
                            : "-"
                    }
                </strong>
                <span>
                    📏 En Uzun
                </span>
            </div>

        </div>
    `;

    list.innerHTML =
        catches.map(item => {
            let dateText = "-";

            if (item.date) {
                const date =
                    new Date(item.date);

                if (!Number.isNaN(date.getTime())) {
                    dateText =
                        date.toLocaleString(
                            "tr-TR",
                            {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                            }
                        );
                }
            }

            return `
                <div class="catch-card">

                    ${
                        item.photo
                            ? `
                                <img
                                    class="catch-card-photo"
                                    src="${item.photo}"
                                    alt="Av fotoğrafı"
                                >
                            `
                            : ""
                    }

                    <div class="catch-card-top">

                        <h3>
                            🐟 ${escapeHtml(item.fish)}
                        </h3>

                        <button
                            class="delete-catch"
                            data-delete-catch="${item.id}"
                        >
                            🗑️
                        </button>

                    </div>

                    <div class="catch-details">

                        ${
                            item.weight
                                ? `
                                    <p>
                                        ⚖️ ${item.weight} kg
                                    </p>
                                `
                                : ""
                        }

                        ${
                            item.length
                                ? `
                                    <p>
                                        📏 ${item.length} cm
                                    </p>
                                `
                                : ""
                        }

                        ${
                            item.location
                                ? `
                                    <p>
                                        📍 ${escapeHtml(item.location)}
                                    </p>
                                `
                                : ""
                        }

                        <p>
                            🕐 ${dateText}
                        </p>

                    </div>

                    ${
                        item.note
                            ? `
                                <p class="catch-note">
                                    “${escapeHtml(item.note)}”
                                </p>
                            `
                            : ""
                    }

                </div>
            `;
        }).join("");

    list.querySelectorAll(
        "[data-delete-catch]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            async () => {
                if (
                    !confirm(
                        "Bu avı ortak günlükten silmek istiyor musun?"
                    )
                ) return;

                try {
                    await deleteDoc(
                        doc(
                            db,
                            "catches",
                            button.dataset.deleteCatch
                        )
                    );
                } catch (error) {
                    console.error(error);
                }
            }
        );
    });
}


/* =========================================
   FOTOĞRAF KÜÇÜLTME
========================================= */

function compressImage(file) {
    return new Promise(
        (resolve, reject) => {
            const reader =
                new FileReader();

            reader.onload = event => {
                const image =
                    new Image();

                image.onload = () => {
                    const maxWidth = 650;

                    const scale =
                        Math.min(
                            1,
                            maxWidth / image.width
                        );

                    const canvas =
                        document.createElement(
                            "canvas"
                        );

                    canvas.width =
                        Math.round(
                            image.width * scale
                        );

                    canvas.height =
                        Math.round(
                            image.height * scale
                        );

                    const ctx =
                        canvas.getContext("2d");

                    ctx.drawImage(
                        image,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );

                    let quality = 0.55;

                    let result =
                        canvas.toDataURL(
                            "image/jpeg",
                            quality
                        );

                    while (
                        result.length > 700000 &&
                        quality > 0.25
                    ) {
                        quality -= 0.1;

                        result =
                            canvas.toDataURL(
                                "image/jpeg",
                                quality
                            );
                    }

                    resolve(result);
                };

                image.onerror =
                    reject;

                image.src =
                    event.target.result;
            };

            reader.onerror =
                reject;

            reader.readAsDataURL(file);
        }
    );
}


/* =========================================
   ŞANS ORTAK AKVARYUM
========================================= */

const aquariumRef =
    doc(
        db,
        "shared",
        "aquarium"
    );

let aquariumListenerStarted =
    false;


document.getElementById(
    "feedSansBtn"
)?.addEventListener(
    "click",
    feedSans
);


document.getElementById(
    "cleanTankBtn"
)?.addEventListener(
    "click",
    cleanTank
);


function startAquariumListener() {
    if (
        aquariumListenerStarted ||
        !firebaseReady
    ) return;

    aquariumListenerStarted = true;

    onSnapshot(
        aquariumRef,

        snapshot => {
            renderAquariumState(
                snapshot.exists()
                    ? snapshot.data()
                    : {}
            );
        },

        error => {
            console.error(
                "Akvaryum:",
                error
            );
        }
    );
}


async function feedSans() {
    if (!firebaseReady) return;

    createFoodEffect();

    try {
        await setDoc(
            aquariumRef,

            {
                lastFeeding:
                    new Date().toISOString()
            },

            {
                merge: true
            }
        );
    } catch (error) {
        console.error(error);
    }
}


async function cleanTank() {
    if (!firebaseReady) return;

    const tank =
        document.querySelector(
            ".tank-scene"
        );

    tank?.classList.add(
        "cleaning"
    );

    setTimeout(() => {
        tank?.classList.remove(
            "cleaning"
        );
    }, 1800);

    try {
        await setDoc(
            aquariumRef,

            {
                lastCleaning:
                    new Date().toISOString()
            },

            {
                merge: true
            }
        );
    } catch (error) {
        console.error(error);
    }
}


function renderAquariumState(state) {
    const feeding =
        document.getElementById(
            "lastFeeding"
        );

    const mood =
        document.getElementById(
            "fishMood"
        );

    const tankStatus =
        document.getElementById(
            "tankStatus"
        );

    const algae =
        document.getElementById(
            "algaeLayer"
        );

    if (state.lastFeeding) {
        const date =
            new Date(
                state.lastFeeding
            );

        feeding.textContent =
            date.toLocaleString(
                "tr-TR",
                {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );

        const hours =
            (
                Date.now() -
                date.getTime()
            ) / 3600000;

        if (hours < 8) {
            mood.textContent =
                "Karnı tok 💙";
        } else if (hours < 24) {
            mood.textContent =
                "Keyfi yerinde 🐠";
        } else {
            mood.textContent =
                "Biraz acıkmış 👀";
        }

    } else {
        feeding.textContent =
            "Henüz beslenmedi";

        mood.textContent =
            "Yerinde";
    }

    algae.className =
        "algae-layer";

    if (!state.lastCleaning) {
        tankStatus.textContent =
            "🫧 Temizlik bekliyor";

        algae.classList.add(
            "algae-medium"
        );

        return;
    }

    const cleaningDate =
        new Date(
            state.lastCleaning
        );

    const days =
        Math.floor(
            (
                Date.now() -
                cleaningDate.getTime()
            ) /
            86400000
        );

    if (days <= 1) {
        tankStatus.textContent =
            "✨ Tertemiz";
    } else if (days <= 3) {
        tankStatus.textContent =
            "🟢 Temiz";

        algae.classList.add(
            "algae-light"
        );
    } else if (days <= 6) {
        tankStatus.textContent =
            "🌿 Yosunlanıyor";

        algae.classList.add(
            "algae-medium"
        );
    } else {
        tankStatus.textContent =
            "🧽 Temizlik zamanı";

        algae.classList.add(
            "algae-heavy"
        );
    }
}


/* =========================================
   YEM EFEKTİ
========================================= */

function createFoodEffect() {
    const tank =
        document.querySelector(
            ".tank-scene"
        );

    if (!tank) return;

    for (let i = 0; i < 9; i++) {
        const food =
            document.createElement(
                "span"
            );

        food.className =
            "fish-food";

        food.textContent = "•";

        food.style.left =
            (
                10 +
                Math.random() * 80
            ) + "%";

        food.style.animationDelay =
            Math.random() * 0.4 +
            "s";

        tank.appendChild(food);

        setTimeout(() => {
            food.remove();
        }, 3000);
    }
}


/* =========================================
   ŞANS YÜZSÜN
========================================= */

function swimSans() {
    const fish =
        document.getElementById(
            "sansFish"
        );

    const tank =
        document.querySelector(
            ".tank-scene"
        );

    if (!fish || !tank) return;

    const maxX =
        Math.max(
            20,
            tank.clientWidth -
            fish.offsetWidth -
            20
        );

    const maxY =
        Math.max(
            20,
            tank.clientHeight -
            fish.offsetHeight -
            20
        );

    const x =
        10 +
        Math.random() *
        Math.max(10, maxX - 10);

    const y =
        10 +
        Math.random() *
        Math.max(10, maxY - 10);

    const previous =
        Number(
            fish.dataset.x || 0
        );

    fish.style.transform =
        x < previous
            ? "scaleX(-1)"
            : "scaleX(1)";

    fish.style.left =
        x + "px";

    fish.style.top =
        y + "px";

    fish.dataset.x =
        x;
}

setTimeout(
    swimSans,
    800
);

setInterval(
    swimSans,
    3500
);


/* =========================================
   BALIK REHBERİ
========================================= */

const fishGuideData = {
    izmir: [
        {
            emoji: "🐠",
            name: "Levrek",
            latin:
                "Dicentrarchus labrax",
            habitat:
                "Kıyılar, lagünler ve nehir ağızları",
            hours:
                "05:00–08:00 / 18:00–22:00",
            bait:
                "Karides, küçük balık, silikon",
            info:
                "Sabah ve akşam düşük ışıkta daha hareketli olabilir."
        },

        {
            emoji: "🐟",
            name: "Çipura",
            latin:
                "Sparus aurata",
            habitat:
                "Kumluk, taşlık ve deniz çayırı alanları",
            hours:
                "06:00–10:00 / 17:00–21:00",
            bait:
                "Mamun, karides, midye",
            info:
                "İzmir kıyılarında en sevilen hedef türlerden biridir."
        },

        {
            emoji: "🐟",
            name: "Karagöz",
            latin:
                "Diplodus vulgaris",
            habitat:
                "Kayalık ve taşlık kıyılar",
            hours:
                "06:00–09:00 / 18:00–22:00",
            bait:
                "Karides, mamun, midye",
            info:
                "Kayalık bölgelerde aranabilir."
        },

        {
            emoji: "🐟",
            name: "Kefal",
            latin:
                "Mugil cephalus",
            habitat:
                "Liman, lagün ve nehir ağızları",
            hours:
                "07:00–11:00 / 16:00–20:00",
            bait:
                "Ekmek, hamur, kurt",
            info:
                "Kıyıda ve acı su bölgelerinde görülebilir."
        }
    ],

    manisa: [
        {
            emoji: "🐟",
            name: "Sazan",
            latin:
                "Cyprinus carpio",
            habitat:
                "Baraj gölleri, göller ve sakin tatlı sular",
            hours:
                "05:00–10:00 / 17:00–21:00",
            bait:
                "Mısır, hamur, solucan, boilie",
            info:
                "Dipte beslenen güçlü bir tatlı su balığıdır."
        },

        {
            emoji: "🐟",
            name: "Sudak",
            latin:
                "Sander lucioperca",
            habitat:
                "Baraj gölleri ve derin tatlı sular",
            hours:
                "04:00–08:00 / 18:00–23:00",
            bait:
                "Silikon ve küçük balık",
            info:
                "Düşük ışık koşullarında aktif olabilir."
        },

        {
            emoji: "🐋",
            name: "Yayın",
            latin:
                "Silurus glanis",
            habitat:
                "Derin ve sakin tatlı sular",
            hours:
                "20:00–04:00",
            bait:
                "Solucan ve balık",
            info:
                "Büyük boylara ulaşabilen güçlü bir avcıdır."
        }
    ]
};


document.querySelectorAll(
    ".fish-city"
).forEach(button => {
    button.addEventListener(
        "click",
        () => {
            showFishCity(
                button.dataset.city,
                button
            );
        }
    );
});


function showFishCity(
    city,
    clickedButton = null
) {
    document.querySelectorAll(
        ".fish-city"
    ).forEach(button => {
        button.classList.remove(
            "active"
        );
    });

    if (clickedButton) {
        clickedButton.classList.add(
            "active"
        );
    } else {
        document.querySelector(
            `.fish-city[data-city="${city}"]`
        )?.classList.add(
            "active"
        );
    }

    const list =
        document.getElementById(
            "fishGuideList"
        );

    if (!list) return;

    const fishes =
        fishGuideData[city] || [];

    list.innerHTML =
        fishes.map(fish => `
            <div class="fish-guide-card">

                <div class="fish-guide-head">

                    <div class="fish-guide-emoji">
                        ${fish.emoji}
                    </div>

                    <div>
                        <h3>
                            ${fish.name}
                        </h3>

                        <small>
                            ${fish.latin}
                        </small>
                    </div>

                </div>

                <div class="fish-guide-info">

                    <div>
                        <span>
                            📍 Yaşam Alanı
                        </span>

                        <strong>
                            ${fish.habitat}
                        </strong>
                    </div>

                    <div>
                        <span>
                            ⏰ Aktif Saat
                        </span>

                        <strong>
                            ${fish.hours}
                        </strong>
                    </div>

                    <div>
                        <span>
                            🪱 Yem
                        </span>

                        <strong>
                            ${fish.bait}
                        </strong>
                    </div>

                </div>

                <p>
                    💡 ${fish.info}
                </p>

            </div>
        `).join("");
}


/* =========================================
   NİSU'DAN
========================================= */

const nisaMessages = [
    "Balıklar kaçsa da ben buradayım. 🎣🤍",
    "Bugün şansın oltanın ucunda olsun. ⭐",
    "Deniz sakin, kafa rahat, av bol olsun. 🌊",
    "Eve güzel bir hikâyeyle dön yeter. ❤️",
    "Rüzgâr arkandan, şans yanında olsun. 🍀",
    "Şans sana uğur getirsin. 🐠💙"
];

const sansMessages = [
    "Babacım bugün akvaryumu temizlemeyi unutma 🐠",
    "Ben yeme doydum, şimdi sıra senin avında 🎣",
    "Bugün büyük balık geliyor, hissediyorum 👀",
    "Beni beslemeden ava çıkmak yok 🍤",
    "Nisu seni seviyor, ben de yemi seviyorum 💙",
    "Bugün şansın açık. İsmim boşuna Şans değil ⭐"
];


document.getElementById(
    "changeNisaMessageBtn"
)?.addEventListener(
    "click",
    () => {
        const message =
            nisaMessages[
                Math.floor(
                    Math.random() *
                    nisaMessages.length
                )
            ];

        document.getElementById(
            "nisaMessage"
        ).textContent =
            message;
    }
);


document.getElementById(
    "getSansMessageBtn"
)?.addEventListener(
    "click",
    () => {
        const message =
            sansMessages[
                Math.floor(
                    Math.random() *
                    sansMessages.length
                )
            ];

        document.getElementById(
            "sansMessageBubble"
        ).textContent =
            message;
    }
);


/* =========================================
   AŞK SAYACI
========================================= */

function updateLoveCounter() {
    const start =
        new Date(
            2026,
            7,
            14,
            0,
            0,
            0
        );

    const difference =
        Math.max(
            0,
            Date.now() -
            start.getTime()
        );

    const days =
        Math.floor(
            difference /
            86400000
        );

    const hours =
        Math.floor(
            difference /
            3600000
        ) % 24;

    const minutes =
        Math.floor(
            difference /
            60000
        ) % 60;

    const seconds =
        Math.floor(
            difference /
            1000
        ) % 60;

    const dayElement =
        document.getElementById(
            "loveDays"
        );

    if (!dayElement) return;

    dayElement.textContent =
        days;

    document.getElementById(
        "loveHours"
    ).textContent =
        hours;

    document.getElementById(
        "loveMinutes"
    ).textContent =
        minutes;

    document.getElementById(
        "loveSeconds"
    ).textContent =
        seconds;
}


/* =========================================
   BAŞLANGIÇ
========================================= */

showFishCity("izmir");

updateLoveCounter();

setInterval(
    updateLoveCounter,
    1000
);


if (firebaseReady) {
    startFavoritesListener();
    startCatchesListener();
    startAquariumListener();
}


/*
  Varsayılan olarak İzmir hava durumu.
  Konum seçilince otomatik değişecek.
*/

getWeather(
    38.4237,
    27.1428
);


/* =========================================
   SERVICE WORKER
========================================= */

if ("serviceWorker" in navigator) {
    window.addEventListener(
        "load",
        async () => {
            try {
                await navigator.serviceWorker.register(
                    "./service-worker.js"
                );

                console.log(
                    "📱 Erosarium PWA hazır."
                );

            } catch (error) {
                console.error(
                    "Service Worker:",
                    error
                );
            }
        }
    );
}

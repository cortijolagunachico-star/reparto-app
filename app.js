/*
========================================================================
   LÓGICA DE NEGOCIO Y PERSISTENCIA - APP DE REPARTO MULTINEGOCIO
========================================================================
*/

// Estado Global de la Aplicación
let db = {
    settings: {},
    products: [],
    clients: [],
    orders: [],
    payments: []
};

// Variable para el estado de navegación y simulación
let currentMode = 'admin'; // 'admin' o 'client'
let currentView = 'reparto'; // Vista activa
let activeSimulatedClientId = null; // Cliente seleccionado en el simulador
let selectedPaymentMethod = 'Tarjeta'; // Tarjeta, Bizum, Efectivo
let rutaCurrentFilter = 'pending'; // 'pending', 'delivered', 'all'
let quickSelectedMethod = 'Efectivo';
let syncChannel = null;

// 1. INICIALIZACIÓN Y CARGA DE DATOS
document.addEventListener('DOMContentLoaded', () => {
    initPWA();
    initRealtimeSync();
    initDatabase();
    initAppDate();
    applyDynamicBranding();
    renderActiveView();
    populateClientSimulatorDropdown();
});

// Registro de Service Worker para PWA (instalación en móviles y tablets)
function initPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('PWA Service Worker registrado con éxito.'))
            .catch(err => console.log('Error registrando PWA Service Worker:', err));
    }
}

// Sincronización en tiempo real multi-dispositivo y multi-pestaña
function initRealtimeSync() {
    try {
        syncChannel = new BroadcastChannel('reparto_realtime_sync');
        syncChannel.onmessage = (e) => {
            if (e.data && e.data.type === 'SYNC_UPDATE') {
                const localData = localStorage.getItem('reparto_multinegocio_db');
                if (localData) {
                    db = JSON.parse(localData);
                    renderActiveView();
                    console.log('🔄 Datos sincronizados en tiempo real.');
                }
            }
        };
    } catch (err) {
        console.log('BroadcastChannel no soportado en este entorno:', err);
    }

    // Escuchar cambios de localStorage en otras pestañas/dispositivos
    window.addEventListener('storage', (e) => {
        if (e.key === 'reparto_multinegocio_db') {
            const localData = localStorage.getItem('reparto_multinegocio_db');
            if (localData) {
                db = JSON.parse(localData);
                renderActiveView();
            }
        }
    });
}

// Inicializa la base de datos local con datos de prueba si está vacía
function initDatabase() {
    const localData = localStorage.getItem('reparto_multinegocio_db');
    if (localData) {
        db = JSON.parse(localData);
        // Asegurar campos básicos por compatibilidad
        if (!db.payments) db.payments = [];
        if (!db.orders) db.orders = [];
    } else {
        // Cargar por defecto la plantilla de Panadería
        loadBakeryPresetData();
    }
}

// Guarda el estado actual en LocalStorage y notifica a otros dispositivos/pestañas
function saveState() {
    localStorage.setItem('reparto_multinegocio_db', JSON.stringify(db));
    
    // Difundir en tiempo real a otras pestañas/móviles
    if (syncChannel) {
        syncChannel.postMessage({ type: 'SYNC_UPDATE', timestamp: Date.now() });
    }

    // Sincronización en la nube opcional
    if (db.settings && db.settings.firebaseConfig) {
        syncToCloudFirestore();
    }
}

// 2. CONFIGURACIONES Y PLANTILLAS PREDEFINIDAS
function loadBakeryPresetData() {
    db.settings = {
        businessName: "Panadería La Tradición",
        businessType: "Panadería",
        adminRoleName: "Panadero",
        primaryColor: "#d97706",
        fontFamily: "'Outfit', sans-serif",
        logoUrl: ""
    };

    // Todos los productos de panadería solicitados por el usuario
    db.products = [
        // Medio Kilo (2.00 €)
        { id: 1, name: "Pan de medio kilo (Bobo)", price: 2.00, category: "Pan Grande", image: "", description: "Pan tradicional de miga densa cocido en horno de piedra." },
        { id: 2, name: "Pan de medio kilo (Bobo de lata)", price: 2.00, category: "Pan Grande", image: "", description: "Moldeado en lata metálica para una corteza uniforme." },
        { id: 3, name: "Pan de medio kilo (Apelmazado)", price: 2.00, category: "Pan Grande", image: "", description: "Miga compacta ideal para tostadas y rebanadas firmes." },
        { id: 4, name: "Pan de medio kilo (Ceñido)", price: 2.00, category: "Pan Grande", image: "", description: "Masa trabajada a mano con un ceñido característico." },
        { id: 5, name: "Pan de medio kilo (Cateto)", price: 2.00, category: "Pan Grande", image: "", description: "Elaborado con harina de trigo duro local, muy duradero." },
        { id: 6, name: "Pan de medio kilo (Rústico)", price: 2.00, category: "Pan Grande", image: "", description: "Pan de masa madre con corteza rústica e intensa." },
        { id: 7, name: "Pan de medio kilo (Cuatro cortes)", price: 2.00, category: "Pan Grande", image: "", description: "Pan tradicional marcado con cuatro cortes en cruz." },
        { id: 8, name: "Pan de medio kilo (De cruz)", price: 2.00, category: "Pan Grande", image: "", description: "Pan sobado tradicional con la cruz marcada." },
        { id: 9, name: "Bolsa de 5 antequeranillos", price: 2.00, category: "Especialidades", image: "", description: "Paquete de 5 molletes de tamaño medio perfectos para desayunos." },

        // Cuartos y otros (1.20 €)
        { id: 10, name: "Pan de cuarto (Bobo)", price: 1.20, category: "Pan Cuarto", image: "", description: "Formato individual de miga sobada." },
        { id: 11, name: "Pan de cuarto (Rústico)", price: 1.20, category: "Pan Cuarto", image: "", description: "Corteza crujiente en tamaño mediano." },
        { id: 12, name: "Bollo de teta", price: 1.20, category: "Pan Cuarto", image: "", description: "Pan tierno tradicional de masa blanca." },
        { id: 13, name: "Bollo de piña", price: 1.20, category: "Pan Cuarto", image: "", description: "Pan tradicional con varios cortes formando protuberancias." },
        { id: 14, name: "Rosca de pan", price: 1.20, category: "Pan Cuarto", image: "", description: "Pan en forma de anillo con miga esponjosa." },
        { id: 15, name: "Barra de pan", price: 1.20, category: "Pan Cuarto", image: "", description: "Barra tradicional de harina de trigo." },
        { id: 16, name: "Barra rústica", price: 1.20, category: "Pan Cuarto", image: "", description: "Barra artesana con mayor hidratación y alveolado." },
        { id: 17, name: "Gallega", price: 1.20, category: "Pan Cuarto", image: "", description: "Pan gallego de hidratación alta y corteza fina." },
        { id: 18, name: "Rústica de cuarto", price: 1.20, category: "Pan Cuarto", image: "", description: "Hogacilla rústica en formato individual." },

        // Especial Soja (0.65 €)
        { id: 19, name: "Viena de soja", price: 0.65, category: "Especialidades", image: "", description: "Panecillo tierno enriquecido con harina de soja." },

        // Pequeños (0.60 €)
        { id: 20, name: "Bollito de teta", price: 0.60, category: "Pan Pequeño", image: "", description: "Versión pequeña y tierna del bollo tradicional." },
        { id: 21, name: "Bollito de piña", price: 0.60, category: "Pan Pequeño", image: "", description: "Formato individual con cortes en piña." },
        { id: 22, name: "Mollete", price: 0.60, category: "Pan Pequeño", image: "", description: "Pan blanco, blando y poco cocido originario de Andalucía." },
        { id: 23, name: "Mollete rústico", price: 0.60, category: "Pan Pequeño", image: "", description: "Mollete con un toque de harina integral." },
        { id: 24, name: "Antequerano", price: 0.60, category: "Pan Pequeño", image: "", description: "Panecillo típico de Antequera, ideal para tostar." },
        { id: 25, name: "Malagueña", price: 0.60, category: "Pan Pequeño", image: "", description: "Mollete alargado suave y tierno." },
        { id: 26, name: "Malagueña rústica", price: 0.60, category: "Pan Pequeño", image: "", description: "Versión rústica con miga aromática." },
        { id: 27, name: "Viena", price: 0.60, category: "Pan Pequeño", image: "", description: "Panecillo redondo de corteza fina y miga suave." },
        { id: 28, name: "Viena integral", price: 0.60, category: "Pan Pequeño", image: "", description: "Viena elaborada con 100% harina de trigo integral." },

        // Pitufos y otros (0.50 €)
        { id: 29, name: "Lengua", price: 0.50, category: "Pan Pequeño", image: "", description: "Pan alargado y plano de masa muy crujiente." },
        { id: 30, name: "Vienecilla", price: 0.50, category: "Pan Pequeño", image: "", description: "Viena miniatura ideal para tapas." },
        { id: 31, name: "Pitufo soja", price: 0.50, category: "Pan Pequeño", image: "", description: "Pitufo andaluz enriquecido con soja." },
        { id: 32, name: "Pan de hamburguesa", price: 0.50, category: "Especialidades", image: "", description: "Pan redondo tierno cubierto con sésamo." },

        // Pitufos normales (0.45 €)
        { id: 33, name: "Pitufo", price: 0.45, category: "Pitufos", image: "", description: "El clásico panecillo malagueño para el desayuno." },
        { id: 34, name: "Pitufo rústico", price: 0.45, category: "Pitufos", image: "", description: "Pitufo de masa madre rústica con más sabor." },
        { id: 35, name: "Pitufo integral", price: 0.45, category: "Pitufos", image: "", description: "Pitufo con harina integral rico en fibra." },
        { id: 36, name: "Antequeranillo individual", price: 0.45, category: "Pitufos", image: "", description: "Pequeño mollete antequerano para tostadas." },

        // Bolillas (0.30 €)
        { id: 37, name: "Bolilla", price: 0.30, category: "Mini Pan", image: "", description: "Panecillo redondo muy pequeño." },
        { id: 38, name: "Pitufo bolilla", price: 0.30, category: "Mini Pan", image: "", description: "Mini pitufo con forma esférica." },

        // Pulgas (0.25 €)
        { id: 39, name: "Pitufo pulguita", price: 0.25, category: "Mini Pan", image: "", description: "Pan de bocado tierno." },
        { id: 40, name: "Pulga", price: 0.25, category: "Mini Pan", image: "", description: "El formato de bocadillo más pequeño del catálogo." }
    ];

    // Clientes iniciales para probar con deudas iniciales
    db.clients = [
        {
            id: 1,
            name: "María García Torres",
            address: "Calle Larios 14, 2ºA, Málaga",
            phone: "600112233",
            subscriptions: [
                { productId: 6, quantity: 1, frequency: "daily" }, // 1 Rústico de medio kilo al día (2€)
                { productId: 22, quantity: 4, frequency: "weekly", days: [6] } // 4 molletes los Sábados (2.40€)
            ],
            balance: 14.50
        },
        {
            id: 2,
            name: "Juan Antonio Pérez",
            address: "Avda de Prados 32, Rincón de la Victoria",
            phone: "611223344",
            subscriptions: [
                { productId: 16, quantity: 2, frequency: "weekly", days: [1, 3, 5] }, // 2 barras rústicas Lunes, Miércoles, Viernes (2.40€ por envío)
                { productId: 9, quantity: 1, frequency: "weekly", days: [0] } // 1 bolsa de antequeranillos los Domingos (2.00€)
            ],
            balance: 0.00
        },
        {
            id: 3,
            name: "Cafetería El Sol",
            address: "Plaza de la Constitución 5, Málaga",
            phone: "952123456",
            subscriptions: [
                { productId: 33, quantity: 30, frequency: "daily" }, // 30 pitufos diarios (13.50€/día)
                { productId: 22, quantity: 20, frequency: "daily" } // 20 molletes diarios (12.00€/día)
            ],
            balance: 125.80
        }
    ];

    // Órdenes previas entregadas
    db.orders = [
        {
            id: "o_1721111000",
            clientId: 1,
            date: getOffsetDateString(-1), // Ayer
            items: [{ productId: 6, quantity: 1, price: 2.00 }],
            total: 2.00,
            status: "delivered",
            isRecurring: true
        },
        {
            id: "o_1721112000",
            clientId: 3,
            date: getOffsetDateString(-1), // Ayer
            items: [
                { productId: 33, quantity: 30, price: 0.45 },
                { productId: 22, quantity: 20, price: 0.60 }
            ],
            total: 25.50,
            status: "delivered",
            isRecurring: true
        }
    ];

    // Pagos previos
    db.payments = [
        {
            id: "p_1721115000",
            clientId: 3,
            date: getOffsetDateString(-2),
            amount: 50.00,
            method: "Bizum"
        }
    ];

    saveState();
}

function loadFrozenPresetData() {
    db.settings = {
        businessName: "Congelados del Mar",
        businessType: "Congelados",
        adminRoleName: "Distribuidor",
        primaryColor: "#0284c7", // Azul océano
        fontFamily: "'Outfit', sans-serif",
        logoUrl: ""
    };

    db.products = [
        { id: 1, name: "Caja de Langostinos Salvajes (2kg)", price: 24.50, category: "Marisco", image: "", description: "Langostinos congelados a bordo." },
        { id: 2, name: "Lomos de Merluza Selecta (1kg)", price: 9.80, category: "Pescado", image: "", description: "Lomos limpios sin espinas listos para cocinar." },
        { id: 3, name: "Bolsa de Filetes de Panga (1kg)", price: 4.50, category: "Pescado", image: "", description: "Filetes tiernos y económicos." },
        { id: 4, name: "Anillas de Calamar Extra (1kg)", price: 8.90, category: "Cefalópodos", image: "", description: "Calamar limpio en anillas tiernas." },
        { id: 5, name: "Bolsa de Guisantes Finos (1kg)", price: 2.10, category: "Verduras", image: "", description: "Guisantes ultracongelados al momento de cosecha." },
        { id: 6, name: "Salmón Noruego en Porciones (500g)", price: 11.20, category: "Pescado", image: "", description: "Porciones individuales de salmón de acuicultura noruega." }
    ];

    db.clients = [
        {
            id: 1,
            name: "Restaurante Bahía",
            address: "Paseo Marítimo 12, Torremolinos",
            phone: "602334455",
            subscriptions: [
                { productId: 1, quantity: 5, frequency: "weekly", days: [1, 4] }, // Lunes y Jueves
                { productId: 4, quantity: 10, frequency: "weekly", days: [1, 4] }
            ],
            balance: 211.50
        },
        {
            id: 2,
            name: "Pescadería Hermanos Luque",
            address: "Calle Mercado 3, Alhaurín de la Torre",
            phone: "612445566",
            subscriptions: [
                { productId: 2, quantity: 15, frequency: "weekly", days: [2] } // Martes
            ],
            balance: 0.00
        }
    ];

    db.orders = [];
    db.payments = [];
    saveState();
}

function loadDrinksPresetData() {
    db.settings = {
        businessName: "Bebidas Distribución Sanz",
        businessType: "Bebidas",
        adminRoleName: "Distribuidor",
        primaryColor: "#059669", // Verde Esmeralda
        fontFamily: "'Montserrat', sans-serif",
        logoUrl: ""
    };

    db.products = [
        { id: 1, name: "Caja de Refresco de Cola (24 Latas)", price: 14.90, category: "Refrescos", image: "", description: "Latas de aluminio estándar de 33cl." },
        { id: 2, name: "Pack de Agua Mineral 1.5L (6 Botellas)", price: 3.20, category: "Agua", image: "", description: "Agua de manantial débilmente mineralizada." },
        { id: 3, name: "Barril de Cerveza Pilsen (30L)", price: 68.00, category: "Cerveza", image: "", description: "Cerveza de barril rubia para grifo." },
        { id: 4, name: "Caja Cerveza Especial 24 botellines (25cl)", price: 18.50, category: "Cerveza", image: "", description: "Botellines no retornables." },
        { id: 5, name: "Caja Zumo de Naranja Natural (12ud x 1L)", price: 12.00, category: "Zumos", image: "", description: "Brik de zumo exprimido premium." }
    ];

    db.clients = [
        {
            id: 1,
            name: "Bar Central",
            address: "Calle Nueva 2, Málaga",
            phone: "603445566",
            subscriptions: [
                { productId: 3, quantity: 2, frequency: "weekly", days: [1, 4] }, // 2 barriles los Lunes y Jueves (136€ por envío)
                { productId: 1, quantity: 5, frequency: "weekly", days: [1, 4] }
            ],
            balance: 421.00
        },
        {
            id: 2,
            name: "Kiosko Alameda",
            address: "Paseo de la Alameda S/N, Málaga",
            phone: "623556677",
            subscriptions: [
                { productId: 2, quantity: 10, frequency: "weekly", days: [3, 6] } // Miércoles y Sábados
            ],
            balance: 64.00
        }
    ];

    db.orders = [];
    db.payments = [];
    saveState();
}

function applyBusinessPreset(presetType) {
    if (confirm("¿Estás seguro de que deseas aplicar esta plantilla? Esto reemplazará el catálogo de productos, clientes de prueba y configuraciones actuales.")) {
        if (presetType === 'bakery') {
            loadBakeryPresetData();
        } else if (presetType === 'fish') {
            loadFrozenPresetData();
        } else if (presetType === 'drinks') {
            loadDrinksPresetData();
        }
        
        // Resetear vistas
        currentMode = 'admin';
        currentView = 'reparto';
        activeSimulatedClientId = db.clients.length > 0 ? db.clients[0].id : null;
        
        saveState();
        applyDynamicBranding();
        populateClientSimulatorDropdown();
        renderActiveView();
        
        // Actualizar UI del selector de plantilla activa
        document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
        document.getElementById(`preset-${presetType}`).classList.add('active');
        
        // Rellenar campos de configuración con los nuevos datos
        loadSettingsViewFields();
    }
}

// 3. ENRUTAMIENTO Y VISTAS DEL SPA
function switchSystemMode(mode) {
    currentMode = mode;
    
    // Cambiar clases de botones activos en cabecera
    if (mode === 'admin') {
        document.getElementById('btn-mode-admin').classList.add('active');
        document.getElementById('btn-mode-client').classList.remove('active');
        document.getElementById('menu-admin').style.display = 'flex';
        document.getElementById('menu-client').style.display = 'none';
        document.getElementById('simulated-client-wrapper').style.display = 'none';
        currentView = 'reparto';
    } else {
        document.getElementById('btn-mode-admin').classList.remove('active');
        document.getElementById('btn-mode-client').classList.add('active');
        document.getElementById('menu-admin').style.display = 'none';
        document.getElementById('menu-client').style.display = 'flex';
        document.getElementById('simulated-client-wrapper').style.display = 'block';
        
        // Inicializar cliente activo en el simulador si no hay uno
        if (!activeSimulatedClientId && db.clients.length > 0) {
            activeSimulatedClientId = db.clients[0].id;
        }
        document.getElementById('client-simulator-select').value = activeSimulatedClientId;
        currentView = 'client-dashboard';
    }
    
    renderActiveView();
}

function switchView(viewId) {
    currentView = viewId;
    renderActiveView();
}

function renderActiveView() {
    // Desactivar todas las pestañas de navegación y secciones
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.section-view').forEach(view => view.classList.remove('active'));
    
    // Activar sección actual
    const targetSection = document.getElementById(`view-${currentView}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Activar item de navegación correspondiente
    const navItem = document.getElementById(`nav-${currentView}`);
    if (navItem) {
        navItem.classList.add('active');
    }
    
    // Actualizar contenidos de vistas específicas
    if (currentView === 'ruta-movil') {
        loadRutaMovil();
    } else if (currentView === 'reparto') {
        loadRepartoDay();
    } else if (currentView === 'catalog') {
        renderCatalog();
    } else if (currentView === 'clients') {
        renderClients();
    } else if (currentView === 'finance') {
        renderFinance();
    } else if (currentView === 'settings') {
        loadSettingsViewFields();
    } else if (currentView === 'client-dashboard') {
        renderClientDashboard();
    } else if (currentView === 'client-subs') {
        renderClientSubs();
    } else if (currentView === 'client-oneoff') {
        renderClientOneOff();
    } else if (currentView === 'client-history') {
        renderClientHistory();
    }
}

// Inicializar input de fecha con el día actual
function initAppDate() {
    const today = new Date().toISOString().split('T')[0];
    const repInput = document.getElementById('reparto-date-input');
    if (repInput) repInput.value = today;
    const rutaInput = document.getElementById('ruta-date-input');
    if (rutaInput) rutaInput.value = today;
}

// 4. APLICACIÓN DE ESTILOS DINÁMICOS (MARCA BLANCA)
function applyDynamicBranding() {
    const s = db.settings;
    
    // Crear o modificar nodo style en head
    let styleTag = document.getElementById('dynamic-theme-styles');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'dynamic-theme-styles';
        document.head.appendChild(styleTag);
    }
    
    // Calcular hover color y light color para el primario dinámico
    const hex = s.primaryColor || '#d97706';
    const rgb = hexToRgb(hex);
    const primaryHover = darkenColor(hex, 15);
    const primaryLight = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`;
    const font = s.fontFamily || "'Outfit', sans-serif";
    
    styleTag.textContent = `
        :root {
            --primary-color: ${hex} !important;
            --primary-hover: ${primaryHover} !important;
            --primary-light: ${primaryLight} !important;
            --font-family: ${font} !important;
        }
    `;
    
    // Cambiar textos dinámicos de cabecera y configuración
    document.getElementById('app-brand-name').innerText = s.businessName || "Distribución";
    document.getElementById('app-logo').innerText = (s.businessName || "D")[0].toUpperCase();
    
    // Configuración de etiquetas según tipo de negocio
    const sector = s.businessType || "Panadería";
    const role = s.adminRoleName || "Panadero";
    
    document.getElementById('lbl-admin-mode-name').innerText = `Modo ${role}`;
    document.getElementById('lbl-catalog-nav-name').innerText = `Catálogo ${sector === "Panadería" ? "Panes" : "Productos"}`;
    document.getElementById('lbl-catalog-title').innerText = `Catálogo de ${sector === "Panadería" ? "Panes y Productos" : "Productos"}`;
    
    // Cambios en la vista móvil de demostración
    const previewBrand = document.getElementById('preview-brand-name');
    if (previewBrand) previewBrand.innerText = s.businessName || "Mi Negocio";
    const previewLogo = document.getElementById('preview-logo');
    if (previewLogo) {
        previewLogo.innerText = (s.businessName || "L")[0].toUpperCase();
    }
    const previewRole = document.getElementById('preview-role-tag');
    if (previewRole) previewRole.innerText = role;
}

function updateColorLive(val) {
    document.getElementById('setting-color-hex').innerText = val.toUpperCase();
    
    // Actualizar estilo al vuelo para feedback inmediato
    let styleTag = document.getElementById('dynamic-theme-styles');
    if (styleTag) {
        const rgb = hexToRgb(val);
        const primaryHover = darkenColor(val, 15);
        const primaryLight = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`;
        styleTag.textContent = `
            :root {
                --primary-color: ${val} !important;
                --primary-hover: ${primaryHover} !important;
                --primary-light: ${primaryLight} !important;
            }
        `;
    }
}

// 5. FUNCIONES PARA REPARTO DIARIO (ADMIN)
function loadRepartoDay() {
    const selectedDate = document.getElementById('reparto-date-input').value;
    const dayOrders = db.orders.filter(o => o.date === selectedDate);
    const tableBody = document.getElementById('reparto-table-body');
    
    tableBody.innerHTML = '';
    
    if (dayOrders.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2.5rem 1rem;">
                    <i class="fa-solid fa-calendar-xmark" style="font-size: 2rem; margin-bottom: 0.5rem; display: block; color: var(--primary-color);"></i>
                    No hay repartos generados para este día.<br>
                    <button class="btn btn-primary btn-small" style="margin-top: 1rem;" onclick="generateDailyOrdersForSelectedDate()">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Generar del Día
                    </button>
                </td>
            </tr>
        `;
        document.getElementById('stat-pending-deliveries').innerText = '0';
        document.getElementById('stat-completed-deliveries').innerText = '0';
        document.getElementById('stat-day-earnings').innerText = '0.00 €';
        return;
    }
    
    let totalCollected = 0;
    let pendingCount = 0;
    let completedCount = 0;
    
    dayOrders.forEach(order => {
        const client = db.clients.find(c => c.id === order.clientId);
        if (!client) return;
        
        // Sumar importes
        totalCollected += order.total;
        if (order.status === 'pending') pendingCount++;
        if (order.status === 'delivered') completedCount++;
        
        // Generar listado de productos
        let productsHtml = '<ul class="order-items-list">';
        order.items.forEach(item => {
            const prod = db.products.find(p => p.id === item.productId);
            const name = prod ? prod.name : `Producto #${item.productId}`;
            productsHtml += `<li><span>${name}</span> <strong>x${item.quantity}</strong></li>`;
        });
        productsHtml += '</ul>';
        
        // Badges de estado
        let statusBadge = '';
        if (order.status === 'pending') {
            statusBadge = '<span class="badge badge-pending"><i class="fa-solid fa-clock"></i> Repartiendo</span>';
        } else if (order.status === 'delivered') {
            statusBadge = '<span class="badge badge-delivered"><i class="fa-solid fa-circle-check"></i> Entregado</span>';
        } else {
            statusBadge = '<span class="badge badge-cancelled"><i class="fa-solid fa-circle-xmark"></i> Cancelado</span>';
        }
        
        // Botones de acciones
        let actionsHtml = `<div class="client-actions" style="display:flex; gap:0.35rem; justify-content:flex-end; align-items:center;">`;
        if (client.phone) {
            actionsHtml += `
                <a href="${generateOrderWhatsAppUrl(order.id)}" target="_blank" class="btn btn-small" style="background: rgba(37,211,102,0.15); color: #25d366; border: 1px solid rgba(37,211,102,0.3); padding: 0.4rem 0.6rem; text-decoration:none;" title="Enviar WhatsApp con pedido y saldo acumulado">
                    <i class="fa-brands fa-whatsapp"></i>
                </a>
            `;
        }
        if (order.status === 'pending') {
            actionsHtml += `
                <button class="btn btn-success btn-small" title="Entregar" onclick="changeOrderStatus('${order.id}', 'delivered')">
                    <i class="fa-solid fa-check"></i> Entregado
                </button>
                <button class="btn btn-danger btn-small" title="Cancelar" onclick="changeOrderStatus('${order.id}', 'cancelled')">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
        } else {
            // Permitir volver a pendiente por si fue error
            actionsHtml += `
                <button class="btn btn-secondary btn-small" title="Revertir a reparto" onclick="changeOrderStatus('${order.id}', 'pending')">
                    <i class="fa-solid fa-rotate-left"></i> Revertir
                </button>
            `;
        }
        actionsHtml += `</div>`;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <strong>${client.name}</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.15rem;">
                    <i class="fa-solid fa-location-dot"></i> ${client.address}
                </div>
            </td>
            <td>${productsHtml}</td>
            <td style="font-weight: bold; font-size: 0.95rem;">${order.total.toFixed(2)} €</td>
            <td>
                <span style="font-size: 0.75rem; color: var(--text-muted);">
                    ${order.isRecurring ? '<i class="fa-solid fa-arrows-spin"></i> Recurrente' : '<i class="fa-solid fa-basket-shopping"></i> Puntual'}
                </span>
            </td>
            <td>${statusBadge}</td>
            <td style="text-align: right;">${actionsHtml}</td>
        `;
        tableBody.appendChild(row);
    });
    
    // Actualizar estadísticas superiores
    document.getElementById('stat-pending-deliveries').innerText = pendingCount;
    document.getElementById('stat-completed-deliveries').innerText = completedCount;
    document.getElementById('stat-day-earnings').innerText = `${totalCollected.toFixed(2)} €`;
}

// Genera los pedidos diarios basados en suscripciones de los clientes
function generateDailyOrdersForSelectedDate() {
    const selectedDateStr = document.getElementById('reparto-date-input').value;
    if (!selectedDateStr) return;
    
    const selectedDate = new Date(selectedDateStr + 'T00:00:00'); // Evitar problemas de huso
    const dayOfWeek = selectedDate.getDay(); // 0 = Domingo, 1 = Lunes, etc.
    const dayOfMonth = selectedDate.getDate(); // 1 al 31
    
    // Filtrar clientes que tienen suscripciones para este día
    let ordersGenerated = 0;
    
    db.clients.forEach(client => {
        // Comprobar si el cliente tiene pausado el reparto por vacaciones
        if (client.vacation && client.vacation.active) {
            if (client.vacation.start && client.vacation.end) {
                if (selectedDateStr >= client.vacation.start && selectedDateStr <= client.vacation.end) {
                    return; // Cliente en vacaciones: no generar pedido
                }
            } else if (client.vacation.start && selectedDateStr >= client.vacation.start) {
                return; // Pausa activa desde la fecha de inicio
            } else if (!client.vacation.start && !client.vacation.end) {
                return; // Pausa indefinida activa
            }
        }

        // Comprobar si ya existe algún pedido para este cliente en esta fecha
        const alreadyExists = db.orders.some(o => o.clientId === client.id && o.date === selectedDateStr);
        if (alreadyExists) return;
        
        const items = [];
        let orderTotal = 0;
        
        client.subscriptions.forEach(sub => {
            let matches = false;
            
            if (sub.frequency === 'daily') {
                matches = true;
            } else if (sub.frequency === 'weekly') {
                // weekly days es array de números de día. Domingo es 0, Lunes es 1.
                if (sub.days && sub.days.map(Number).includes(dayOfWeek)) {
                    matches = true;
                }
            } else if (sub.frequency === 'monthly') {
                // monthly repite el mismo día del mes (o último si excede)
                if (dayOfMonth === 1) { // Por defecto el 1 de cada mes
                    matches = true;
                }
            }
            
            if (matches) {
                const product = db.products.find(p => p.id === sub.productId);
                if (product) {
                    items.push({
                        productId: sub.productId,
                        quantity: Number(sub.quantity),
                        price: product.price
                    });
                    orderTotal += product.price * Number(sub.quantity);
                }
            }
        });
        
        if (items.length > 0) {
            db.orders.push({
                id: 'o_' + Date.now() + '_' + client.id,
                clientId: client.id,
                date: selectedDateStr,
                items: items,
                total: orderTotal,
                status: 'pending',
                isRecurring: true
            });
            ordersGenerated++;
        }
    });
    
    if (ordersGenerated > 0) {
        saveState();
        loadRepartoDay();
        alert(`Se han generado con éxito ${ordersGenerated} pedidos de reparto para hoy.`);
    } else {
        alert("No se generó ningún pedido nuevo. Es posible que ya estén creados o que ningún cliente tenga reparto programado en este día.");
    }
}

// Cambiar el estado de un pedido (Repartiendo / Entregado / Cancelado)
function changeOrderStatus(orderId, newStatus) {
    const orderIndex = db.orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return;
    
    const order = db.orders[orderIndex];
    const client = db.clients.find(c => c.id === order.clientId);
    
    // Si pasa a entregado, la deuda del cliente sube por el coste del pedido
    if (newStatus === 'delivered' && order.status !== 'delivered') {
        if (client) {
            client.balance += order.total;
        }
    }
    // Si se revierte de entregado a pendiente/cancelado, restamos el importe de la deuda
    else if (order.status === 'delivered' && newStatus !== 'delivered') {
        if (client) {
            client.balance = Math.max(0, client.balance - order.total);
        }
    }
    
    order.status = newStatus;
    saveState();
    loadRepartoDay();
    
    // Si estamos simulando a este cliente, actualizar también los saldos visuales
    if (currentMode === 'client' && client && client.id === activeSimulatedClientId) {
        renderClientDashboard();
    }
}

// 6. GESTIÓN DEL CATÁLOGO DE PRODUCTOS (ADMIN)
function renderCatalog() {
    const container = document.getElementById('catalog-grid-container');
    container.innerHTML = '';
    
    db.products.forEach(prod => {
        const card = document.createElement('div');
        card.className = 'card product-card';
        
        // Si no tiene imagen, se pone un fallback de color primario con el icono
        const sector = db.settings.businessType || "Panadería";
        const fallbackIcon = sector === 'Panadería' ? 'fa-bread-slice' : (sector === 'Congelados' ? 'fa-fish' : 'fa-wine-bottle');
        const imgHtml = prod.image 
            ? `<img src="${prod.image}" alt="${prod.name}" class="product-img">`
            : `<div style="width: 100%; height: 150px; background: linear-gradient(135deg, var(--primary-light), var(--primary-hover)); display: flex; align-items: center; justify-content: center; font-size: 3rem; color: #ffffff;"><i class="fa-solid ${fallbackIcon}"></i></div>`;
            
        card.innerHTML = `
            <div class="product-img-wrapper">
                ${imgHtml}
                <div class="product-price-tag">${prod.price.toFixed(2)} €</div>
            </div>
            <div class="product-body">
                <span style="font-size: 0.65rem; text-transform: uppercase; font-weight: bold; color: var(--primary-color); letter-spacing: 0.5px;">${prod.category || 'General'}</span>
                <h3 class="product-title">${prod.name}</h3>
                <p class="product-desc">${prod.description || 'Sin descripción disponible.'}</p>
                <div class="product-actions">
                    <button class="btn btn-secondary btn-small" onclick="openEditProductModal(${prod.id})" style="flex: 1;">
                        <i class="fa-solid fa-pencil"></i> Editar
                    </button>
                    <button class="btn btn-danger btn-small" onclick="deleteProduct(${prod.id})" title="Borrar">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function openAddProductModal() {
    document.getElementById('modal-product-title').innerText = "Nuevo Producto";
    document.getElementById('form-product-id').value = '';
    document.getElementById('form-product-name').value = '';
    document.getElementById('form-product-price').value = '';
    document.getElementById('form-product-category').value = '';
    document.getElementById('form-product-image').value = '';
    document.getElementById('form-product-description').value = '';
    
    openModal('modal-product');
}

function openEditProductModal(id) {
    const prod = db.products.find(p => p.id === id);
    if (!prod) return;
    
    document.getElementById('modal-product-title').innerText = "Editar Producto";
    document.getElementById('form-product-id').value = prod.id;
    document.getElementById('form-product-name').value = prod.name;
    document.getElementById('form-product-price').value = prod.price.toFixed(2);
    document.getElementById('form-product-category').value = prod.category || '';
    document.getElementById('form-product-image').value = prod.image || '';
    document.getElementById('form-product-description').value = prod.description || '';
    
    openModal('modal-product');
}

function saveProductFromForm() {
    const id = document.getElementById('form-product-id').value;
    const name = document.getElementById('form-product-name').value.trim();
    const price = parseFloat(document.getElementById('form-product-price').value);
    const category = document.getElementById('form-product-category').value.trim();
    const image = document.getElementById('form-product-image').value.trim();
    const description = document.getElementById('form-product-description').value.trim();
    
    if (!name || isNaN(price)) {
        alert("El nombre y el precio son obligatorios.");
        return;
    }
    
    if (id) {
        // Editar existente
        const prod = db.products.find(p => p.id == id);
        if (prod) {
            prod.name = name;
            prod.price = price;
            prod.category = category;
            prod.image = image;
            prod.description = description;
        }
    } else {
        // Crear nuevo
        const newId = db.products.length > 0 ? Math.max(...db.products.map(p => p.id)) + 1 : 1;
        db.products.push({ id: newId, name, price, category, image, description });
    }
    
    saveState();
    closeModal('modal-product');
    renderCatalog();
}

function deleteProduct(id) {
    if (confirm("¿Estás seguro de borrar este producto del catálogo? Las suscripciones existentes que usen este producto no podrán cargarse de nuevo.")) {
        db.products = db.products.filter(p => p.id !== id);
        saveState();
        renderCatalog();
    }
}

// 7. GESTIÓN DE CLIENTES Y SUSCRIPCIONES (ADMIN)
function renderClients() {
    const container = document.getElementById('clients-grid-container');
    container.innerHTML = '';
    
    db.clients.forEach(client => {
        const isDebt = client.balance > 0;
        const balanceClass = isDebt ? 'client-balance in-debt' : 'client-balance settled';
        
        // Sumar suscripciones activas
        let subsHtml = '';
        if (client.subscriptions && client.subscriptions.length > 0) {
            client.subscriptions.forEach(sub => {
                const prod = db.products.find(p => p.id === sub.productId);
                const name = prod ? prod.name : `Prod #${sub.productId}`;
                let freqText = sub.frequency === 'daily' ? 'Diario' : (sub.frequency === 'weekly' ? 'Semanal' : 'Mensual');
                if (sub.frequency === 'weekly' && sub.days) {
                    const diasLetras = ['D','L','M','X','J','V','S'];
                    const diasFormateados = sub.days.map(d => diasLetras[d]).join(',');
                    freqText = `${freqText} (${diasFormateados})`;
                }
                subsHtml += `<div class="client-sub-row"><span>${name} x${sub.quantity}</span> <span style="color: var(--text-muted); font-size: 0.75rem;">${freqText}</span></div>`;
            });
        } else {
            subsHtml = '<div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">Sin entregas programadas</div>';
        }
        
        const card = document.createElement('div');
        card.className = 'card client-card';
        card.innerHTML = `
            <div>
                <div class="client-header">
                    <div class="client-info">
                        <h3>${client.name}</h3>
                        <p><i class="fa-solid fa-phone"></i> ${client.phone || 'Sin teléfono'}</p>
                        <p style="margin-top: 0.15rem;"><i class="fa-solid fa-location-dot"></i> ${client.address}</p>
                    </div>
                    <div class="${balanceClass}">
                        ${client.balance.toFixed(2)} €
                        <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: normal;">Deuda</div>
                    </div>
                </div>
                
                <div class="client-subs-summary">
                    <div class="client-subs-title"><i class="fa-solid fa-arrows-spin"></i> Entregas Recurrentes</div>
                    ${subsHtml}
                </div>
            </div>
            
            <div class="client-actions" style="margin-top: 1rem;">
                <button class="btn btn-secondary btn-small" onclick="openClientSubsModal(${client.id})" style="flex: 1;">
                    <i class="fa-solid fa-calendar-days"></i> Programar
                </button>
                <button class="btn btn-secondary btn-small" onclick="openEditClientModal(${client.id})" title="Editar Datos">
                    <i class="fa-solid fa-user-pen"></i>
                </button>
                <button class="btn btn-danger btn-small" onclick="deleteClient(${client.id})" title="Dar de baja">
                    <i class="fa-solid fa-user-minus"></i>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function openAddClientModal() {
    document.getElementById('modal-client-title').innerText = "Nuevo Cliente";
    document.getElementById('form-client-id').value = '';
    document.getElementById('form-client-name').value = '';
    document.getElementById('form-client-phone').value = '';
    document.getElementById('form-client-address').value = '';
    document.getElementById('form-client-balance').value = '0.00';
    document.getElementById('form-client-balance').disabled = false;
    
    openModal('modal-client');
}

function openEditClientModal(id) {
    const client = db.clients.find(c => c.id === id);
    if (!client) return;
    
    document.getElementById('modal-client-title').innerText = "Editar Cliente";
    document.getElementById('form-client-id').value = client.id;
    document.getElementById('form-client-name').value = client.name;
    document.getElementById('form-client-phone').value = client.phone || '';
    document.getElementById('form-client-address').value = client.address;
    document.getElementById('form-client-balance').value = client.balance.toFixed(2);
    document.getElementById('form-client-balance').disabled = true; // No modificar saldo directamente, requiere pasar por caja
    
    openModal('modal-client');
}

function saveClientFromForm() {
    const id = document.getElementById('form-client-id').value;
    const name = document.getElementById('form-client-name').value.trim();
    const phone = document.getElementById('form-client-phone').value.trim();
    const address = document.getElementById('form-client-address').value.trim();
    const balance = parseFloat(document.getElementById('form-client-balance').value) || 0;
    
    if (!name || !address) {
        alert("El nombre y la dirección son requeridos.");
        return;
    }
    
    if (id) {
        // Editar
        const client = db.clients.find(c => c.id == id);
        if (client) {
            client.name = name;
            client.phone = phone;
            client.address = address;
        }
    } else {
        // Crear
        const newId = db.clients.length > 0 ? Math.max(...db.clients.map(c => c.id)) + 1 : 1;
        db.clients.push({
            id: newId,
            name,
            phone,
            address,
            subscriptions: [],
            balance
        });
    }
    
    saveState();
    closeModal('modal-client');
    populateClientSimulatorDropdown();
    renderClients();
}

function deleteClient(id) {
    if (confirm("¿Estás seguro de eliminar a este cliente? Se borrarán todos sus pedidos y suscripciones del sistema.")) {
        db.clients = db.clients.filter(c => c.id !== id);
        db.orders = db.orders.filter(o => o.clientId !== id);
        db.payments = db.payments.filter(p => p.clientId !== id);
        saveState();
        populateClientSimulatorDropdown();
        renderClients();
    }
}

// 8. MODAL DE SUSCRIPCIONES (ADMIN)
function openClientSubsModal(clientId) {
    const client = db.clients.find(c => c.id === clientId);
    if (!client) return;
    
    document.getElementById('form-sub-client-id').value = client.id;
    document.getElementById('modal-client-subs-title').innerText = `Suscripciones de ${client.name}`;
    
    // Cargar desplegable de productos
    const productSelect = document.getElementById('form-sub-product');
    productSelect.innerHTML = '';
    db.products.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.innerText = `${p.name} (${p.price.toFixed(2)} €)`;
        productSelect.appendChild(option);
    });
    
    renderClientSubsListInModal(client);
    openModal('modal-client-subs');
}

function renderClientSubsListInModal(client) {
    const listBody = document.getElementById('form-client-subs-list-body');
    listBody.innerHTML = '';
    
    if (!client.subscriptions || client.subscriptions.length === 0) {
        listBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); font-style:italic;">Sin suscripciones activas</td></tr>`;
        return;
    }
    
    client.subscriptions.forEach((sub, idx) => {
        const prod = db.products.find(p => p.id === sub.productId);
        const name = prod ? prod.name : `Prod #${sub.productId}`;
        let freqText = sub.frequency === 'daily' ? 'Diario' : (sub.frequency === 'weekly' ? 'Semanal' : 'Mensual');
        if (sub.frequency === 'weekly' && sub.days) {
            const diasLetras = ['D','L','M','X','J','V','S'];
            freqText += ` (${sub.days.map(d => diasLetras[d]).join(',')})`;
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${name}</strong></td>
            <td><span style="font-size:0.8rem;">${freqText}</span></td>
            <td style="font-weight:bold;">x${sub.quantity}</td>
            <td>
                <button class="btn btn-danger btn-small" onclick="removeSubscriptionFromAdmin(${client.id}, ${idx})" style="padding: 0.2rem 0.4rem;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        listBody.appendChild(row);
    });
}

function onFormSubFreqChange(freq) {
    const daysWrapper = document.getElementById('form-sub-days-wrapper');
    if (freq === 'weekly') {
        daysWrapper.style.display = 'block';
    } else {
        daysWrapper.style.display = 'none';
    }
}

function addSubscriptionFromAdminForm() {
    const clientId = parseInt(document.getElementById('form-sub-client-id').value);
    const productId = parseInt(document.getElementById('form-sub-product').value);
    const quantity = parseInt(document.getElementById('form-sub-qty').value) || 1;
    const frequency = document.getElementById('form-sub-freq').value;
    
    const client = db.clients.find(c => c.id === clientId);
    if (!client) return;
    
    let days = [];
    if (frequency === 'weekly') {
        const checkboxes = document.querySelectorAll('#form-sub-days-wrapper .day-checkbox:checked');
        checkboxes.forEach(cb => days.push(parseInt(cb.value)));
        if (days.length === 0) {
            alert("Selecciona al menos un día para el reparto semanal.");
            return;
        }
    }
    
    if (!client.subscriptions) client.subscriptions = [];
    client.subscriptions.push({
        productId,
        quantity,
        frequency,
        days: frequency === 'weekly' ? days : undefined
    });
    
    saveState();
    renderClientSubsListInModal(client);
    renderClients();
    
    // Limpiar campos
    document.getElementById('form-sub-qty').value = '1';
    document.getElementById('form-sub-freq').value = 'daily';
    document.getElementById('form-sub-days-wrapper').style.display = 'none';
    document.querySelectorAll('#form-sub-days-wrapper .day-checkbox').forEach(cb => cb.checked = false);
}

function removeSubscriptionFromAdmin(clientId, idx) {
    const client = db.clients.find(c => c.id === clientId);
    if (!client) return;
    
    client.subscriptions.splice(idx, 1);
    saveState();
    renderClientSubsListInModal(client);
    renderClients();
}

// 9. VISTA DE FINANZAS / CAJA Y COBROS (ADMIN)
function renderFinance() {
    // Saldos Totales
    let totalDebt = 0;
    db.clients.forEach(c => totalDebt += c.balance);
    document.getElementById('stat-total-debt').innerText = `${totalDebt.toFixed(2)} €`;
    
    let totalCollected = 0;
    db.payments.forEach(p => totalCollected += p.amount);
    document.getElementById('stat-total-collected').innerText = `${totalCollected.toFixed(2)} €`;
    
    // Tabla Clientes Deudores
    const clientsBody = document.getElementById('finance-clients-table-body');
    clientsBody.innerHTML = '';
    
    const deudores = db.clients.filter(c => c.balance > 0);
    if (deudores.length === 0) {
        clientsBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:2rem;">¡Genial! No hay deudas pendientes actualmente.</td></tr>`;
    } else {
        deudores.forEach(client => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${client.name}</strong></td>
                <td>
                    <span style="font-size:0.8rem; color:var(--text-muted);"><i class="fa-solid fa-phone"></i> ${client.phone}</span><br>
                    <span style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-location-dot"></i> ${client.address}</span>
                </td>
                <td style="color:var(--danger); font-weight:bold; font-size:1rem;">${client.balance.toFixed(2)} €</td>
                <td style="text-align:right;">
                    <div style="display:inline-flex; gap:0.4rem; justify-content:flex-end;">
                        <a href="${generateDebtReminderWhatsAppUrl(client.id)}" target="_blank" class="btn btn-small" style="background: rgba(37,211,102,0.15); color: #25d366; border: 1px solid rgba(37,211,102,0.3); text-decoration:none; padding: 0.4rem 0.6rem; display:inline-flex; align-items:center; gap:0.35rem;" title="Recordar saldo acumulado por WhatsApp">
                            <i class="fa-brands fa-whatsapp"></i> Recordar
                        </a>
                        <button class="btn btn-success btn-small" onclick="openAdminPaymentModal(${client.id})">
                            <i class="fa-solid fa-hand-holding-dollar"></i> Cobrar
                        </button>
                    </div>
                </td>
            `;
            clientsBody.appendChild(row);
        });
    }
    
    // Tabla de Cobros Realizados
    const paymentsBody = document.getElementById('finance-payments-table-body');
    paymentsBody.innerHTML = '';
    
    if (db.payments.length === 0) {
        paymentsBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">No se ha registrado ningún pago todavía.</td></tr>`;
    } else {
        // Mostrar los 15 más recientes
        const sortedPayments = [...db.payments].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 15);
        sortedPayments.forEach(payment => {
            const client = db.clients.find(c => c.id === payment.clientId);
            const clientName = client ? client.name : `Cliente Borrado #${payment.clientId}`;
            
            // Método icono
            let methodIcon = 'fa-credit-card';
            if (payment.method === 'Bizum') methodIcon = 'fa-mobile-screen-button';
            if (payment.method === 'Efectivo') methodIcon = 'fa-money-bill-1-wave';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(payment.date)}</td>
                <td><strong>${clientName}</strong></td>
                <td style="color:var(--accent); font-weight:bold;">${payment.amount.toFixed(2)} €</td>
                <td><i class="fa-solid ${methodIcon}" style="color:var(--accent);"></i> ${payment.method}</td>
                <td><span style="font-family:monospace; font-size:0.75rem;">${payment.id}</span></td>
            `;
            paymentsBody.appendChild(row);
        });
    }
}

function openAdminPaymentModal(clientId) {
    const client = db.clients.find(c => c.id === clientId);
    if (!client) return;
    
    document.getElementById('form-payment-client-id').value = client.id;
    document.getElementById('form-payment-max-debt').innerText = `${client.balance.toFixed(2)} €`;
    document.getElementById('form-payment-amount').value = client.balance.toFixed(2);
    
    selectPaymentMethod('Tarjeta'); // Por defecto
    openModal('modal-payment');
}

// 10. MODAL MANUAL DE PEDIDO EXTRA (ADMIN)
function openAddManualOrderModal() {
    const clientSelect = document.getElementById('form-order-client');
    clientSelect.innerHTML = '';
    
    db.clients.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.innerText = c.name;
        clientSelect.appendChild(option);
    });
    
    // Inicializar fecha para hoy
    document.getElementById('form-order-date').value = document.getElementById('reparto-date-input').value;
    
    // Rellenar selector de productos con contadores
    const prodSelector = document.getElementById('form-order-products-selector');
    prodSelector.innerHTML = '';
    
    db.products.forEach(p => {
        const row = document.createElement('div');
        row.className = 'order-selector-row';
        row.innerHTML = `
            <div class="order-selector-info">
                <h5>${p.name}</h5>
                <p>${p.price.toFixed(2)} € (${p.category})</p>
            </div>
            <div class="item-qty-selector">
                <button class="item-qty-btn" type="button" onclick="changeManualOrderQty(${p.id}, -1)">-</button>
                <div id="manual-qty-${p.id}" class="item-qty-val">0</div>
                <button class="item-qty-btn" type="button" onclick="changeManualOrderQty(${p.id}, 1)">+</button>
            </div>
        `;
        prodSelector.appendChild(row);
    });
    
    // Resetear total
    document.getElementById('form-order-total-price').innerText = '0.00 €';
    openModal('modal-manual-order');
}

function changeManualOrderQty(productId, delta) {
    const qtyDiv = document.getElementById(`manual-qty-${productId}`);
    if (!qtyDiv) return;
    
    let qty = parseInt(qtyDiv.innerText);
    qty = Math.max(0, qty + delta);
    qtyDiv.innerText = qty;
    
    // Recalcular total
    recalculateManualOrderTotal();
}

function recalculateManualOrderTotal() {
    let total = 0;
    db.products.forEach(p => {
        const qtyDiv = document.getElementById(`manual-qty-${p.id}`);
        if (qtyDiv) {
            const qty = parseInt(qtyDiv.innerText);
            total += qty * p.price;
        }
    });
    document.getElementById('form-order-total-price').innerText = `${total.toFixed(2)} €`;
}

function saveManualOrderFromAdmin() {
    const clientId = parseInt(document.getElementById('form-order-client').value);
    const date = document.getElementById('form-order-date').value;
    
    if (!date) {
        alert("La fecha de entrega es obligatoria.");
        return;
    }
    
    const items = [];
    let total = 0;
    
    db.products.forEach(p => {
        const qtyDiv = document.getElementById(`manual-qty-${p.id}`);
        if (qtyDiv) {
            const qty = parseInt(qtyDiv.innerText);
            if (qty > 0) {
                items.push({
                    productId: p.id,
                    quantity: qty,
                    price: p.price
                });
                total += qty * p.price;
            }
        }
    });
    
    if (items.length === 0) {
        alert("Selecciona al menos un producto con cantidad mayor a 0.");
        return;
    }
    
    // Crear pedido manual
    db.orders.push({
        id: 'o_m_' + Date.now(),
        clientId,
        date,
        items,
        total,
        status: 'pending',
        isRecurring: false
    });
    
    saveState();
    closeModal('modal-manual-order');
    
    // Recargar reparto si la fecha coincide
    const currentRepartoDate = document.getElementById('reparto-date-input').value;
    if (currentRepartoDate === date) {
        loadRepartoDay();
    }
}

// 11. VISTA DE CONFIGURACIÓN Y PERSONALIZACIÓN DE MARCA (ADMIN)
function loadSettingsViewFields() {
    const s = db.settings;
    
    document.getElementById('setting-business-name').value = s.businessName || '';
    document.getElementById('setting-business-type').value = s.businessType || '';
    document.getElementById('setting-admin-role').value = s.adminRoleName || '';
    document.getElementById('setting-primary-color').value = s.primaryColor || '#d97706';
    document.getElementById('setting-color-hex').innerText = (s.primaryColor || '#d97706').toUpperCase();
    document.getElementById('setting-font-family').value = s.fontFamily || "'Outfit', sans-serif";
    document.getElementById('setting-logo-url').value = s.logoUrl || '';
    
    const fbConfigInput = document.getElementById('setting-firebase-config');
    if (fbConfigInput) {
        fbConfigInput.value = s.firebaseConfig || '';
    }

    // Sincronizar plantilla activa
    document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
    if (s.businessType === 'Panadería') {
        document.getElementById('preset-bakery').classList.add('active');
    } else if (s.businessType === 'Congelados') {
        document.getElementById('preset-fish').classList.add('active');
    } else if (s.businessType === 'Bebidas') {
        document.getElementById('preset-drinks').classList.add('active');
    }
}

function saveSettings() {
    db.settings.businessName = document.getElementById('setting-business-name').value.trim();
    db.settings.businessType = document.getElementById('setting-business-type').value.trim();
    db.settings.adminRoleName = document.getElementById('setting-admin-role').value.trim();
    db.settings.primaryColor = document.getElementById('setting-primary-color').value;
    db.settings.fontFamily = document.getElementById('setting-font-family').value;
    db.settings.logoUrl = document.getElementById('setting-logo-url').value.trim();
    
    const fbConfigInput = document.getElementById('setting-firebase-config');
    if (fbConfigInput) {
        db.settings.firebaseConfig = fbConfigInput.value.trim();
    }

    saveState();
    applyDynamicBranding();
    alert("Configuración de marca blanca guardada y aplicada con éxito.");
}

function restoreSettingsDefault() {
    if (confirm("¿Restaurar los valores de marca por defecto de la panadería?")) {
        db.settings = {
            businessName: "Panadería La Tradición",
            businessType: "Panadería",
            adminRoleName: "Panadero",
            primaryColor: "#d97706",
            fontFamily: "'Outfit', sans-serif",
            logoUrl: ""
        };
        saveState();
        applyDynamicBranding();
        loadSettingsViewFields();
    }
}

// 12. MODO CLIENTE: PORTAL Y VISTAS DE AUTOSERVICIO
function populateClientSimulatorDropdown() {
    const select = document.getElementById('client-simulator-select');
    select.innerHTML = '';
    
    db.clients.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.innerText = `${c.name} (${c.address.split(',')[0]})`;
        select.appendChild(opt);
    });
    
    // Mantener selección o elegir el primero
    if (db.clients.length > 0) {
        if (activeSimulatedClientId && db.clients.some(c => c.id === activeSimulatedClientId)) {
            select.value = activeSimulatedClientId;
        } else {
            activeSimulatedClientId = db.clients[0].id;
            select.value = activeSimulatedClientId;
        }
    }
}

function onSimulatedClientChange() {
    activeSimulatedClientId = parseInt(document.getElementById('client-simulator-select').value);
    renderActiveView();
}

// Vista: Mi Cuenta (Dashboard del Cliente)
function renderClientDashboard() {
    const client = db.clients.find(c => c.id === activeSimulatedClientId);
    if (!client) return;
    
    // Actualizar nombre del negocio en cabecera de cliente
    document.getElementById('client-portal-brand-name').innerText = db.settings.businessName || "Distribución";
    document.getElementById('client-portal-logo').innerText = (db.settings.businessName || "D")[0].toUpperCase();
    
    // Balance
    const debtVal = document.getElementById('client-debt-value');
    const payAction = document.getElementById('client-debt-action-container');
    
    debtVal.innerText = `${client.balance.toFixed(2)} €`;
    
    if (client.balance > 0) {
        debtVal.className = 'debt-value has-debt';
        payAction.style.display = 'flex';
        const waBtn = document.getElementById('btn-client-whatsapp-balance');
        if (waBtn) waBtn.href = generateDebtReminderWhatsAppUrl(client.id);
    } else {
        debtVal.className = 'debt-value no-debt';
        payAction.style.display = 'none';
    }

    // Actualizar Estado Modo Vacaciones
    const vacBadge = document.getElementById('client-vacation-status-badge');
    const vacBanner = document.getElementById('client-vacation-active-banner');
    if (vacBadge && vacBanner) {
        if (client.vacation && client.vacation.active) {
            vacBadge.className = 'badge badge-pending';
            vacBadge.innerHTML = '<i class="fa-solid fa-plane-departure"></i> Reparto Pausado';
            vacBanner.style.display = 'block';
            document.getElementById('vacation-banner-start').innerText = client.vacation.start ? formatDate(client.vacation.start) : 'Hoy';
            document.getElementById('vacation-banner-end').innerText = client.vacation.end ? formatDate(client.vacation.end) : 'Indefinido';
        } else {
            vacBadge.className = 'badge badge-delivered';
            vacBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Reparto Activo';
            vacBanner.style.display = 'none';
        }
    }
    
    // Cargar entregas programadas recurrentes
    const subsList = document.getElementById('client-dashboard-subs-list');
    subsList.innerHTML = '';
    
    if (!client.subscriptions || client.subscriptions.length === 0) {
        subsList.innerHTML = `
            <div style="font-size: 0.85rem; color: var(--text-muted); font-style: italic; text-align: center; padding: 1rem 0;">
                No tienes ninguna entrega periódica configurada.
            </div>
        `;
        return;
    }
    
    client.subscriptions.forEach(sub => {
        const prod = db.products.find(p => p.id === sub.productId);
        if (!prod) return;
        
        let freqText = sub.frequency === 'daily' ? 'Reparto diario' : (sub.frequency === 'weekly' ? 'Semanal' : 'Mensual');
        if (sub.frequency === 'weekly' && sub.days) {
            const diasLetras = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
            freqText = `Reparto: ${sub.days.map(d => diasLetras[d]).join(', ')}`;
        }
        
        const subCard = document.createElement('div');
        subCard.className = 'client-sub-card';
        subCard.innerHTML = `
            <div class="sub-detail">
                <h4>${prod.name}</h4>
                <p><i class="fa-solid fa-arrows-spin"></i> ${freqText}</p>
                <p><i class="fa-solid fa-cubes"></i> Cantidad: <strong>${sub.quantity} ud.</strong></p>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 0.95rem; font-weight: 700; color: var(--primary-color);">${(prod.price * sub.quantity).toFixed(2)} €</div>
                <span style="font-size: 0.7rem; color: var(--text-muted);">${prod.price.toFixed(2)} € / ud</span>
            </div>
        `;
        subsList.appendChild(subCard);
    });
}

// Vista: Gestión de Suscripciones del Cliente
function renderClientSubs() {
    const client = db.clients.find(c => c.id === activeSimulatedClientId);
    if (!client) return;
    
    const body = document.getElementById('client-subs-table-body');
    body.innerHTML = '';
    
    if (!client.subscriptions || client.subscriptions.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2.5rem 1rem;">
                    No tienes ninguna suscripción activa actualmente.<br>
                    Pulsa el botón de abajo para programar tus entregas periódicas.
                </td>
            </tr>
        `;
        return;
    }
    
    client.subscriptions.forEach((sub, idx) => {
        const prod = db.products.find(p => p.id === sub.productId);
        if (!prod) return;
        
        let freqText = sub.frequency === 'daily' ? 'Diario' : (sub.frequency === 'weekly' ? 'Semanal' : 'Mensual');
        if (sub.frequency === 'weekly' && sub.days) {
            const diasLetras = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
            freqText = `Semanal (${sub.days.map(d => diasLetras[d]).join(',')})`;
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${prod.name}</strong></td>
            <td>${prod.price.toFixed(2)} €</td>
            <td>${freqText}</td>
            <td><strong>x${sub.quantity}</strong></td>
            <td style="font-weight: bold; color: var(--primary-color);">${(prod.price * sub.quantity).toFixed(2)} €</td>
            <td style="text-align: right;">
                <button class="btn btn-danger btn-small" onclick="removeSubscriptionFromClient(${idx})">
                    <i class="fa-solid fa-trash-can"></i> Desactivar
                </button>
            </td>
        `;
        body.appendChild(row);
    });
}

function openAddSubscriptionModal() {
    const productSelect = document.getElementById('form-client-sub-product');
    productSelect.innerHTML = '';
    db.products.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.innerText = `${p.name} (${p.price.toFixed(2)} €)`;
        productSelect.appendChild(option);
    });
    
    // Limpiar modal
    document.getElementById('form-client-sub-qty').value = '1';
    document.getElementById('form-client-sub-freq').value = 'daily';
    document.getElementById('form-client-sub-days-wrapper').style.display = 'none';
    document.querySelectorAll('#form-client-sub-days-wrapper .client-day-checkbox').forEach(cb => cb.checked = false);
    
    openModal('modal-client-add-sub');
}

function onClientSubFreqChange(freq) {
    const daysWrapper = document.getElementById('form-client-sub-days-wrapper');
    if (freq === 'weekly') {
        daysWrapper.style.display = 'block';
    } else {
        daysWrapper.style.display = 'none';
    }
}

function saveSubscriptionFromClient() {
    const productId = parseInt(document.getElementById('form-client-sub-product').value);
    const quantity = parseInt(document.getElementById('form-client-sub-qty').value) || 1;
    const frequency = document.getElementById('form-client-sub-freq').value;
    
    const client = db.clients.find(c => c.id === activeSimulatedClientId);
    if (!client) return;
    
    let days = [];
    if (frequency === 'weekly') {
        const checkboxes = document.querySelectorAll('#form-client-sub-days-wrapper .client-day-checkbox:checked');
        checkboxes.forEach(cb => days.push(parseInt(cb.value)));
        if (days.length === 0) {
            alert("Por favor, selecciona al menos un día de la semana.");
            return;
        }
    }
    
    if (!client.subscriptions) client.subscriptions = [];
    client.subscriptions.push({
        productId,
        quantity,
        frequency,
        days: frequency === 'weekly' ? days : undefined
    });
    
    saveState();
    closeModal('modal-client-add-sub');
    renderClientSubs();
    renderClientDashboard();
}

function removeSubscriptionFromClient(idx) {
    const client = db.clients.find(c => c.id === activeSimulatedClientId);
    if (!client) return;
    
    if (confirm("¿Desactivar esta suscripción de reparto periódico?")) {
        client.subscriptions.splice(idx, 1);
        saveState();
        renderClientSubs();
        renderClientDashboard();
    }
}

// Vista: Pedido Extra / Puntual (Cliente)
function renderClientOneOff() {
    // Inicializar fecha para mañana
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('client-oneoff-date').value = tomorrow.toISOString().split('T')[0];
    
    // Rellenar catálogo de productos con selectores
    const selector = document.getElementById('client-oneoff-products-selector');
    selector.innerHTML = '';
    
    db.products.forEach(p => {
        const row = document.createElement('div');
        row.className = 'order-selector-row';
        row.innerHTML = `
            <div class="order-selector-info">
                <h5>${p.name}</h5>
                <p>${p.price.toFixed(2)} €</p>
            </div>
            <div class="item-qty-selector">
                <button class="item-qty-btn" type="button" onclick="changeClientOneOffQty(${p.id}, -1)">-</button>
                <div id="oneoff-qty-${p.id}" class="item-qty-val">0</div>
                <button class="item-qty-btn" type="button" onclick="changeClientOneOffQty(${p.id}, 1)">+</button>
            </div>
        `;
        selector.appendChild(row);
    });
    
    document.getElementById('client-oneoff-total-price').innerText = '0.00 €';
}

function changeClientOneOffQty(productId, delta) {
    const qtyDiv = document.getElementById(`oneoff-qty-${productId}`);
    if (!qtyDiv) return;
    
    let qty = parseInt(qtyDiv.innerText);
    qty = Math.max(0, qty + delta);
    qtyDiv.innerText = qty;
    
    recalculateClientOneOffTotal();
}

function recalculateClientOneOffTotal() {
    let total = 0;
    db.products.forEach(p => {
        const qtyDiv = document.getElementById(`oneoff-qty-${p.id}`);
        if (qtyDiv) {
            const qty = parseInt(qtyDiv.innerText);
            total += qty * p.price;
        }
    });
    document.getElementById('client-oneoff-total-price').innerText = `${total.toFixed(2)} €`;
}

function submitClientOneOffOrder() {
    const date = document.getElementById('client-oneoff-date').value;
    if (!date) {
        alert("Por favor, selecciona una fecha de entrega.");
        return;
    }
    
    const items = [];
    let total = 0;
    
    db.products.forEach(p => {
        const qtyDiv = document.getElementById(`oneoff-qty-${p.id}`);
        if (qtyDiv) {
            const qty = parseInt(qtyDiv.innerText);
            if (qty > 0) {
                items.push({
                    productId: p.id,
                    quantity: qty,
                    price: p.price
                });
                total += qty * p.price;
            }
        }
    });
    
    if (items.length === 0) {
        alert("Por favor, añade al menos un producto.");
        return;
    }
    
    // Crear el pedido
    db.orders.push({
        id: 'o_c_' + Date.now(),
        clientId: activeSimulatedClientId,
        date: date,
        items: items,
        total: total,
        status: 'pending',
        isRecurring: false
    });
    
    saveState();
    alert("¡Tu pedido extra ha sido enviado al repartidor con éxito!");
    
    // Resetear view
    renderClientOneOff();
}

// Vista: Historial del Cliente
function renderClientHistory() {
    const ordersBody = document.getElementById('client-history-orders-table-body');
    ordersBody.innerHTML = '';
    
    const clientOrders = db.orders.filter(o => o.clientId === activeSimulatedClientId);
    
    if (clientOrders.length === 0) {
        ordersBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem 0;">No has recibido pedidos todavía.</td></tr>`;
    } else {
        // Ordenar por fecha descendente
        const sortedOrders = [...clientOrders].sort((a,b) => new Date(b.date) - new Date(a.date));
        
        sortedOrders.forEach(order => {
            let productsText = order.items.map(item => {
                const prod = db.products.find(p => p.id === item.productId);
                return `${prod ? prod.name : 'Prod'} (x${item.quantity})`;
            }).join(', ');
            
            let statusBadge = '';
            if (order.status === 'pending') {
                statusBadge = '<span class="badge badge-pending">En Reparto</span>';
            } else if (order.status === 'delivered') {
                statusBadge = '<span class="badge badge-delivered">Entregado</span>';
            } else {
                statusBadge = '<span class="badge badge-cancelled">Cancelado</span>';
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(order.date)}</td>
                <td><span style="font-size: 0.85rem;">${productsText}</span></td>
                <td style="font-weight: bold;">${order.total.toFixed(2)} €</td>
                <td><span style="font-size: 0.75rem; color:var(--text-muted);">${order.isRecurring ? 'Recurrente' : 'Extra'}</span></td>
                <td>${statusBadge}</td>
            `;
            ordersBody.appendChild(row);
        });
    }
    
    // Historial de Pagos
    const paymentsBody = document.getElementById('client-history-payments-table-body');
    paymentsBody.innerHTML = '';
    
    const clientPayments = db.payments.filter(p => p.clientId === activeSimulatedClientId);
    
    if (clientPayments.length === 0) {
        paymentsBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem 0;">No has realizado ningún pago todavía.</td></tr>`;
    } else {
        const sortedPayments = [...clientPayments].sort((a,b) => new Date(b.date) - new Date(a.date));
        sortedPayments.forEach(pay => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(pay.date)}</td>
                <td style="color:var(--accent); font-weight:bold;">${pay.amount.toFixed(2)} €</td>
                <td>${pay.method}</td>
                <td><span style="font-family:monospace; font-size:0.75rem;">${pay.id}</span></td>
            `;
            paymentsBody.appendChild(row);
        });
    }
}

// 13. PROCESAMIENTO DE PAGOS (LIQUIDAR DEUDAS)
function openPaymentModal() {
    const client = db.clients.find(c => c.id === activeSimulatedClientId);
    if (!client) return;
    
    document.getElementById('form-payment-client-id').value = client.id;
    document.getElementById('form-payment-max-debt').innerText = `${client.balance.toFixed(2)} €`;
    document.getElementById('form-payment-amount').value = client.balance.toFixed(2);
    
    selectPaymentMethod('Tarjeta');
    openModal('modal-payment');
}

function selectPaymentMethod(method) {
    selectedPaymentMethod = method;
    
    // Clases activas en la interfaz del modal
    document.getElementById('method-card').classList.remove('active');
    document.getElementById('method-bizum').classList.remove('active');
    document.getElementById('method-cash').classList.remove('active');
    
    if (method === 'Tarjeta') document.getElementById('method-card').classList.add('active');
    if (method === 'Bizum') document.getElementById('method-bizum').classList.add('active');
    if (method === 'Efectivo') document.getElementById('method-cash').classList.add('active');
}

function submitPaymentProcess() {
    const clientId = parseInt(document.getElementById('form-payment-client-id').value);
    const amountToPay = parseFloat(document.getElementById('form-payment-amount').value);
    
    const client = db.clients.find(c => c.id === clientId);
    if (!client) return;
    
    if (isNaN(amountToPay) || amountToPay <= 0) {
        alert("Por favor, introduce un importe válido mayor a 0.");
        return;
    }
    
    if (amountToPay > client.balance) {
        if (!confirm(`El importe a pagar (${amountToPay.toFixed(2)} €) es superior al saldo adeudado (${client.balance.toFixed(2)} €). ¿Proceder de todos modos?`)) {
            return;
        }
    }
    
    // Registrar pago
    const paymentId = 'p_' + Date.now();
    const todayStr = new Date().toISOString().split('T')[0];
    
    db.payments.push({
        id: paymentId,
        clientId: client.id,
        date: todayStr,
        amount: amountToPay,
        method: selectedPaymentMethod
    });
    
    // Restar saldo deudor
    client.balance = Math.max(0, client.balance - amountToPay);
    
    saveState();
    closeModal('modal-payment');
    
    // Mensaje de éxito animado
    alert(`¡Pago completado! Se ha registrado el abono de ${amountToPay.toFixed(2)} € mediante ${selectedPaymentMethod}.`);
    
    // Recargar vista actual
    renderActiveView();
}

// 14. UTILIDADES GENERALES
function openModal(id) {
    document.getElementById(id).classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function getOffsetDateString(daysOffset) {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/AAAA
    }
    return dateStr;
}

// Helpers de Colores
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 217, g: 119, b: 6 };
}

function darkenColor(hex, percent) {
    const rgb = hexToRgb(hex);
    const r = Math.max(0, Math.floor(rgb.r * (100 - percent) / 100));
    const g = Math.max(0, Math.floor(rgb.g * (100 - percent) / 100));
    const b = Math.max(0, Math.floor(rgb.b * (100 - percent) / 100));
    return rgbToHex(r, g, b);
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// 15. MODO RUTA EN FURGONETA (OPTIMIZACIÓN MÓVIL Y TABLET REPARTIDOR)
function loadRutaMovil() {
    const rutaDateInput = document.getElementById('ruta-date-input');
    const repartoDateInput = document.getElementById('reparto-date-input');
    const selectedDate = rutaDateInput ? rutaDateInput.value : (repartoDateInput ? repartoDateInput.value : new Date().toISOString().split('T')[0]);
    
    // Sincronizar inputs
    if (rutaDateInput) rutaDateInput.value = selectedDate;
    if (repartoDateInput) repartoDateInput.value = selectedDate;

    const dayOrders = db.orders.filter(o => o.date === selectedDate);
    const container = document.getElementById('ruta-orders-container');
    if (!container) return;

    // Calcular estadísticas de ruta
    let pendingCount = 0;
    let deliveredCount = 0;
    let pendingMoney = 0;
    let totalMoney = 0;

    dayOrders.forEach(o => {
        totalMoney += o.total;
        if (o.status === 'delivered') {
            deliveredCount++;
        } else if (o.status === 'pending') {
            pendingCount++;
            pendingMoney += o.total;
        }
    });

    // Actualizar Progreso de Entrega
    const totalOrders = dayOrders.length;
    const progressText = document.getElementById('ruta-progress-text');
    if (progressText) progressText.innerText = `${deliveredCount} de ${totalOrders} entregados`;
    
    const pct = totalOrders > 0 ? Math.round((deliveredCount / totalOrders) * 100) : 0;
    const progressBar = document.getElementById('ruta-progress-bar');
    if (progressBar) progressBar.style.width = `${pct}%`;

    const pendMoneyEl = document.getElementById('ruta-pending-money');
    if (pendMoneyEl) pendMoneyEl.innerText = `${pendingMoney.toFixed(2)} €`;

    const totalMoneyEl = document.getElementById('ruta-total-money');
    if (totalMoneyEl) totalMoneyEl.innerText = `${totalMoney.toFixed(2)} €`;

    const countPendEl = document.getElementById('count-ruta-pending');
    if (countPendEl) countPendEl.innerText = pendingCount;

    const countDelivEl = document.getElementById('count-ruta-delivered');
    if (countDelivEl) countDelivEl.innerText = deliveredCount;

    // Filtrar según pestaña activa
    let filteredOrders = dayOrders;
    if (rutaCurrentFilter === 'pending') {
        filteredOrders = dayOrders.filter(o => o.status === 'pending');
    } else if (rutaCurrentFilter === 'delivered') {
        filteredOrders = dayOrders.filter(o => o.status === 'delivered');
    }

    container.innerHTML = '';

    if (filteredOrders.length === 0) {
        let msg = "No hay pedidos en ruta para este filtro.";
        if (dayOrders.length === 0) {
            msg = "No hay pedidos generados para esta fecha. Ve a la vista de 'Reparto Diario' y pulsa 'Generar Pedidos del Día'.";
        } else if (rutaCurrentFilter === 'pending' && pendingCount === 0) {
            msg = "🎉 ¡Excelente trabajo! Has completado todas las entregas de esta ruta.";
        }
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: 3rem 1.5rem; color: var(--text-muted);">
                <i class="fa-solid fa-circle-check" style="font-size: 3rem; color: var(--accent); margin-bottom: 1rem; display: block;"></i>
                <h3 style="font-size: 1.15rem; color: #ffffff; margin-bottom: 0.5rem;">${msg}</h3>
                <p style="font-size: 0.85rem;">Puedes cambiar de filtro o elegir otra fecha arriba.</p>
            </div>
        `;
        return;
    }

    filteredOrders.forEach((order, idx) => {
        const client = db.clients.find(c => c.id === order.clientId);
        if (!client) return;

        const isDelivered = order.status === 'delivered';
        const card = document.createElement('div');
        card.className = `ruta-card ${isDelivered ? 'delivered' : 'pending'}`;

        // Construir productos
        let productsHtml = '<div class="ruta-products-box">';
        order.items.forEach(item => {
            const prod = db.products.find(p => p.id === item.productId);
            const name = prod ? prod.name : `Producto #${item.productId}`;
            productsHtml += `
                <div class="ruta-product-pill">
                    <span><strong>${item.quantity}x</strong> ${name}</span>
                    <span style="color: var(--primary-color); font-weight: 700;">${(item.price * item.quantity).toFixed(2)} €</span>
                </div>
            `;
        });
        productsHtml += '</div>';

        // Enlace GPS y Teléfono
        const encodedAddress = encodeURIComponent(client.address);
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
        const telUrl = `tel:${client.phone || ''}`;

        // Deuda acumulada del cliente
        const hasDebt = client.balance > 0;
        const debtBadge = hasDebt 
            ? `<span style="font-size: 0.8rem; color: var(--danger); font-weight: bold; background: rgba(244, 63, 94, 0.15); padding: 0.25rem 0.6rem; border-radius: 6px;"><i class="fa-solid fa-hand-holding-dollar"></i> Debe: ${client.balance.toFixed(2)} €</span>`
            : `<span style="font-size: 0.8rem; color: var(--accent); font-weight: bold; background: rgba(16, 185, 129, 0.15); padding: 0.25rem 0.6rem; border-radius: 6px;"><i class="fa-solid fa-check"></i> Al día (0 €)</span>`;

        // Botón grande de entrega o revertir
        let actionDeliverHtml = '';
        if (!isDelivered) {
            actionDeliverHtml = `
                <button class="btn-deliver-big" onclick="changeOrderStatusFromRuta('${order.id}', 'delivered')">
                    <i class="fa-solid fa-circle-check"></i> MARCAR ENTREGADO (${order.total.toFixed(2)} €)
                </button>
            `;
        } else {
            actionDeliverHtml = `
                <button class="btn-revert-deliver" onclick="changeOrderStatusFromRuta('${order.id}', 'pending')">
                    <i class="fa-solid fa-rotate-left"></i> Revertir a pendiente
                </button>
            `;
        }

        // Botón rápido de cobro en mano (si el cliente sale a pagar en la puerta)
        let quickPayBtnHtml = '';
        if (hasDebt) {
            quickPayBtnHtml = `
                <button class="btn btn-warning btn-small" onclick="openQuickPayModal(${client.id})" style="font-size: 0.85rem; font-weight: 700; width: 100%; border-radius: 10px; padding: 0.6rem;">
                    <i class="fa-solid fa-money-bill-wave"></i> Cobrar en Puerta (${client.balance.toFixed(2)} €)
                </button>
            `;
        }

        card.innerHTML = `
            <div class="ruta-card-top">
                <div>
                    <div style="font-size: 0.75rem; font-weight: bold; color: var(--primary-color); text-transform: uppercase;">
                        PARADA #${idx + 1} • ${order.isRecurring ? 'Recurrente' : 'Extra'}
                    </div>
                    <div class="ruta-client-name">${client.name}</div>
                    <div class="ruta-client-address">
                        <i class="fa-solid fa-location-dot"></i> ${client.address}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.35rem; font-weight: 800; color: var(--text-main);">${order.total.toFixed(2)} €</div>
                    ${debtBadge}
                </div>
            </div>

            <div class="ruta-quick-actions">
                <a href="${mapsUrl}" target="_blank" class="btn-touch-nav maps" title="Abrir en Google Maps">
                    <i class="fa-solid fa-diamond-turn-right"></i> GPS
                </a>
                <a href="${telUrl}" class="btn-touch-nav phone" title="Llamar">
                    <i class="fa-solid fa-phone"></i> Llamar
                </a>
                <a href="${generateOrderWhatsAppUrl(order.id)}" target="_blank" class="btn-touch-nav whatsapp" title="Enviar WhatsApp con total acumulado">
                    <i class="fa-brands fa-whatsapp"></i> WhatsApp
                </a>
            </div>

            ${productsHtml}

            ${quickPayBtnHtml}

            ${actionDeliverHtml}
        `;

        container.appendChild(card);
    });
}

function filterRutaOrders(filter) {
    rutaCurrentFilter = filter;
    document.querySelectorAll('.ruta-filter-btn').forEach(btn => btn.classList.remove('active'));
    const target = document.getElementById(`tab-filter-${filter}`);
    if (target) target.classList.add('active');
    loadRutaMovil();
}

function syncRutaDate(val) {
    const repInput = document.getElementById('reparto-date-input');
    if (repInput) repInput.value = val;
    loadRutaMovil();
}

function changeOrderStatusFromRuta(orderId, newStatus) {
    changeOrderStatus(orderId, newStatus);
    loadRutaMovil();
}

// 16. COBRO RÁPIDO EN MANO EN RUTA (REPARTIDOR)
function openQuickPayModal(clientId) {
    const client = db.clients.find(c => c.id === clientId);
    if (!client) return;

    document.getElementById('form-quick-client-id').value = client.id;
    document.getElementById('quick-pay-client-name').innerText = client.name;
    document.getElementById('quick-pay-debt-text').innerText = `${client.balance.toFixed(2)} €`;
    document.getElementById('form-quick-amount').value = client.balance.toFixed(2);

    selectQuickMethod('Efectivo');
    openModal('modal-ruta-quick-pay');
}

function selectQuickMethod(method) {
    quickSelectedMethod = method;
    document.getElementById('quick-method-cash').classList.remove('active');
    document.getElementById('quick-method-bizum').classList.remove('active');
    document.getElementById('quick-method-card').classList.remove('active');

    if (method === 'Efectivo') document.getElementById('quick-method-cash').classList.add('active');
    if (method === 'Bizum') document.getElementById('quick-method-bizum').classList.add('active');
    if (method === 'Tarjeta') document.getElementById('quick-method-card').classList.add('active');
}

function submitQuickPayment() {
    const clientId = parseInt(document.getElementById('form-quick-client-id').value);
    const amount = parseFloat(document.getElementById('form-quick-amount').value);
    const client = db.clients.find(c => c.id === clientId);
    if (!client) return;

    if (isNaN(amount) || amount <= 0) {
        alert("Introduce un importe válido.");
        return;
    }

    const paymentId = 'p_q_' + Date.now();
    const todayStr = new Date().toISOString().split('T')[0];

    db.payments.push({
        id: paymentId,
        clientId: client.id,
        date: todayStr,
        amount: amount,
        method: quickSelectedMethod
    });

    client.balance = Math.max(0, client.balance - amount);
    saveState();
    closeModal('modal-ruta-quick-pay');
    alert(`Cobro de ${amount.toFixed(2)} € registrado en mano (${quickSelectedMethod}).`);

    renderActiveView();
}

// 17. MODO VACACIONES / PAUSAR REPARTO (CLIENTE)
function openVacationModal() {
    const client = db.clients.find(c => c.id === activeSimulatedClientId);
    if (!client) return;

    if (client.vacation && client.vacation.active) {
        document.getElementById('vacation-start-date').value = client.vacation.start || '';
        document.getElementById('vacation-end-date').value = client.vacation.end || '';
    } else {
        const todayStr = new Date().toISOString().split('T')[0];
        document.getElementById('vacation-start-date').value = todayStr;
        document.getElementById('vacation-end-date').value = '';
    }
    openModal('modal-client-vacation');
}

function saveClientVacation() {
    const client = db.clients.find(c => c.id === activeSimulatedClientId);
    if (!client) return;

    const start = document.getElementById('vacation-start-date').value;
    const end = document.getElementById('vacation-end-date').value;

    client.vacation = {
        active: true,
        start: start,
        end: end
    };

    saveState();
    closeModal('modal-client-vacation');
    renderClientDashboard();
    alert("¡Modo vacaciones activado! Tus repartos quedan pausados durante las fechas indicadas.");
}

function clearClientVacation() {
    const client = db.clients.find(c => c.id === activeSimulatedClientId);
    if (!client) return;

    client.vacation = {
        active: false,
        start: null,
        end: null
    };

    saveState();
    closeModal('modal-client-vacation');
    renderClientDashboard();
    alert("¡Repartos reanudados! Volverás a recibir tus pedidos con normalidad.");
}

// 18. SINCRONIZACIÓN EN LA NUBE GRATUITA (FIREBASE FIRESTORE)
function saveCloudConfig() {
    const configVal = document.getElementById('setting-firebase-config').value.trim();
    if (!configVal) {
        alert("Por favor, pega el objeto JSON con la configuración de Firebase.");
        return;
    }
    try {
        JSON.parse(configVal); // Validar formato JSON
        db.settings.firebaseConfig = configVal;
        saveState();
        alert("Configuración de Firebase guardada. Probando conexión en la nube...");
        syncToCloudFirestore();
    } catch (e) {
        alert("El texto introducido no es un JSON válido. Revisa que tenga el formato { \"apiKey\": \"...\", \"projectId\": \"...\" }.");
    }
}

function syncNow() {
    saveState();
    alert("Sincronización en tiempo real enviada a todos los dispositivos conectados.");
}

async function syncToCloudFirestore() {
    if (!db.settings || !db.settings.firebaseConfig) return;
    try {
        const conf = JSON.parse(db.settings.firebaseConfig);
        if (!conf.projectId) return;

        // Conexión directa a Firestore REST API (100% gratuita, sin dependencias externas)
        const url = `https://firestore.googleapis.com/v1/projects/${conf.projectId}/databases/(default)/documents/reparto_app/global_state?key=${conf.apiKey || ''}`;
        
        const payload = {
            fields: {
                data: { stringValue: JSON.stringify(db) },
                updatedAt: { stringValue: new Date().toISOString() }
            }
        };

        const res = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const badge = document.getElementById('cloud-sync-status-badge');
            if (badge) {
                badge.className = 'badge badge-delivered';
                badge.style.background = 'rgba(16, 185, 129, 0.15)';
                badge.style.color = 'var(--accent)';
                badge.innerHTML = '<i class="fa-solid fa-cloud-check"></i> Conectado a Firebase Cloud (Sincronizado)';
            }
            console.log('☁️ Sincronizado con Firebase Firestore en la nube.');
        }
    } catch (err) {
        console.log('Nota: Sincronización en la nube disponible cuando se configuran credenciales válidas:', err);
    }
}

// 19. GENERACIÓN DE MENSAJES DE WHATSAPP CON TOTAL ACUMULADO
function formatPhoneForWhatsApp(phone) {
    if (!phone) return '';
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length === 9) {
        cleaned = '34' + cleaned;
    }
    return cleaned;
}

function generateOrderWhatsAppUrl(orderId) {
    const order = db.orders.find(o => o.id === orderId);
    if (!order) return '#';
    const client = db.clients.find(c => c.id === order.clientId);
    if (!client) return '#';

    const phone = formatPhoneForWhatsApp(client.phone);
    const businessName = db.settings.businessName || "Distribución";
    
    // Detalle de productos
    let itemsText = "";
    order.items.forEach(item => {
        const prod = db.products.find(p => p.id === item.productId);
        const name = prod ? prod.name : `Producto #${item.productId}`;
        itemsText += `  • ${item.quantity}x ${name} (${(item.price * item.quantity).toFixed(2)} €)\n`;
    });

    const totalPedido = order.total.toFixed(2);
    const totalAcumulado = client.balance.toFixed(2);

    let message = `¡Hola *${client.name}*! 👋\n\n`;
    message += `Le informamos de su entrega de *${businessName}*:\n\n`;
    message += `📦 *Detalle del pedido de hoy:*\n${itemsText}`;
    message += `💶 *Total entrega de hoy:* ${totalPedido} €\n\n`;
    message += `📊 *TOTAL ACUMULADO PENDIENTE:* *${totalAcumulado} €*\n\n`;
    
    if (client.balance > 0) {
        message += `Puede liquidar su deuda al repartidor en efectivo o tarjeta, o mediante Bizum cuando le sea cómodo.\n`;
    } else {
        message += `¡Su cuenta se encuentra totalmente al corriente de pago (0 €)! 🎉\n`;
    }
    message += `\n¡Muchas gracias por su confianza!`;

    if (!phone) {
        return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    }
    return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
}

function generateDebtReminderWhatsAppUrl(clientId) {
    const client = db.clients.find(c => c.id === clientId);
    if (!client) return '#';

    const phone = formatPhoneForWhatsApp(client.phone);
    const businessName = db.settings.businessName || "Distribución";
    const totalAcumulado = client.balance.toFixed(2);

    let message = `¡Hola *${client.name}*! 👋\n\n`;
    message += `Le escribimos desde *${businessName}* para recordarle el estado actual de su cuenta de entregas a domicilio:\n\n`;
    message += `📊 *TOTAL ACUMULADO PENDIENTE:* *${totalAcumulado} €*\n\n`;
    message += `Puede abonar este saldo en la próxima entrega directamente al repartidor o cómodamente por Bizum.\n\n`;
    message += `Si ya ha realizado el pago, por favor ignore este mensaje.\n¡Muchas gracias por su confianza!`;

    if (!phone) {
        return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    }
    return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
}

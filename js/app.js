// ========== CONFIGURACIÓN ==========
const API_BASE_URL = 'https://api.tvmaze.com';

// ========== FUNCIONES AUXILIARES ==========
function mostrarError(elementoId, mensaje) {
    const elemento = document.getElementById(elementoId);
    if (elemento) {
        elemento.innerHTML = `<p class="error">❌ ${mensaje}</p>`;
    }
    console.error(mensaje);
}

// ========== 1. BUSCAR SERIES ==========
async function buscarSeries(query) {
    try {
        const response = await axios.get(`${API_BASE_URL}/search/shows?q=${encodeURIComponent(query)}`);
        return response.data;
    } catch (error) {
        console.error('Error en búsqueda:', error);
        throw new Error('No se pudieron obtener los resultados de búsqueda');
    }
}

// ========== 2. OBTENER SERIES DESTACADAS ==========
async function obtenerSeriesDestacadas() {
    try {
        // Usamos el endpoint de show index (página 0)
        const response = await axios.get(`${API_BASE_URL}/shows?page=0`);
        return response.data.slice(0, 12); // Limitamos a 12 series
    } catch (error) {
        console.error('Error al obtener series destacadas:', error);
        throw new Error('No se pudieron cargar las series destacadas');
    }
}

// ========== 3. OBTENER DETALLE DE UNA SERIE ==========
async function obtenerDetalleSerie(showId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/shows/${showId}`);
        return response.data;
    } catch (error) {
        console.error('Error al obtener detalle:', error);
        throw new Error('No se pudo cargar la información de la serie');
    }
}

// ========== 4. OBTENER REPARTO DE UNA SERIE ==========
async function obtenerRepartoSerie(showId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/shows/${showId}/cast`);
        return response.data;
    } catch (error) {
        console.error('Error al obtener reparto:', error);
        return []; // Si falla, devolvemos array vacío
    }
}

// ========== 5. RENDERIZAR TARJETAS DE SERIES ==========
function renderizarTarjetas(contenedorId, shows, esBusqueda = false) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    if (!shows || shows.length === 0) {
        contenedor.innerHTML = '<p>No se encontraron resultados.</p>';
        return;
    }

    let html = '';
    const datos = esBusqueda ? shows.map(item => item.show) : shows;

    datos.forEach(show => {
        const imagen = show.image ? show.image.medium : 'https://via.placeholder.com/210x295?text=Sin+imagen';
        const genero = show.genres && show.genres.length > 0 ? show.genres[0] : 'Sin género';
        
        html += `
            <div class="show-card">
                <img src="${imagen}" alt="${show.name}">
                <div class="card-content">
                    <h3>${show.name}</h3>
                    <p>⭐ ${show.rating?.average || 'N/A'} | ${genero}</p>
                    <a href="show-detail.html?id=${show.id}">Ver detalles →</a>
                </div>
            </div>
        `;
    });

    contenedor.innerHTML = html;
}

// ========== 6. INICIALIZAR PÁGINA PRINCIPAL ==========
async function iniciarPaginaPrincipal() {
    // Cargar series destacadas
    try {
        const destacadas = await obtenerSeriesDestacadas();
        renderizarTarjetas('popularShows', destacadas, false);
    } catch (error) {
        mostrarError('popularShows', error.message);
    }

    // Configurar búsqueda
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const query = document.getElementById('searchInput').value.trim();
            const resultsContainer = document.getElementById('searchResults');
            
            if (!query) return;
            
            resultsContainer.innerHTML = '<p>Buscando...</p>';
            
            try {
                const resultados = await buscarSeries(query);
                if (resultados.length === 0) {
                    resultsContainer.innerHTML = '<p>No se encontraron series con ese nombre.</p>';
                } else {
                    renderizarTarjetas('searchResults', resultados, true);
                }
            } catch (error) {
                mostrarError('searchResults', error.message);
            }
        });
    }
}

// ========== 7. INICIALIZAR PÁGINA DE DETALLE ==========
async function iniciarPaginaDetalle() {
    const urlParams = new URLSearchParams(window.location.search);
    const showId = urlParams.get('id');
    
    if (!showId) {
        document.getElementById('showDetail').innerHTML = '<p>No se especificó ninguna serie.</p>';
        return;
    }

    const detailContainer = document.getElementById('showDetail');
    detailContainer.innerHTML = '<p>Cargando información...</p>';

    try {
        const serie = await obtenerDetalleSerie(showId);
        const reparto = await obtenerRepartoSerie(showId);
        
        const imagen = serie.image ? serie.image.original : 'https://via.placeholder.com/300x450?text=Sin+imagen';
        const generos = serie.genres?.join(', ') || 'No especificados';
        const resumen = serie.summary ? serie.summary.replace(/<[^>]*>/g, '') : 'No hay resumen disponible.';
        
        let castHtml = '';
        if (reparto.length > 0) {
            castHtml = '<h3>Reparto principal</h3><div class="cast-list">';
            reparto.slice(0, 10).forEach(actor => {
                const actorImg = actor.person.image?.medium || '';
                castHtml += `
                    <div class="cast-item">
                        ${actorImg ? `<img src="${actorImg}" alt="${actor.person.name}" width="50">` : ''}
                        <p><strong>${actor.person.name}</strong><br>como ${actor.character?.name || '?'}</p>
                    </div>
                `;
            });
            castHtml += '</div>';
        } else {
            castHtml = '<p>No hay información de reparto disponible.</p>';
        }
        
        detailContainer.innerHTML = `
            <div class="detail-header">
                <img src="${imagen}" alt="${serie.name}">
                <div class="detail-info">
                    <h2>${serie.name}</h2>
                    <p><strong>⭐ Rating:</strong> ${serie.rating?.average || 'N/A'}</p>
                    <p><strong>📅 Estreno:</strong> ${serie.premiered || 'No especificado'}</p>
                    <p><strong>🎭 Géneros:</strong> ${generos}</p>
                    <p><strong>📺 Estado:</strong> ${serie.status || 'Desconocido'}</p>
                    <p><strong>📖 Resumen:</strong></p>
                    <p>${resumen}</p>
                </div>
            </div>
            ${castHtml}
        `;
    } catch (error) {
        detailContainer.innerHTML = `<p class="error">❌ ${error.message}</p>`;
    }
}

// ========== 8. DETECTAR QUÉ PÁGINA ESTÁ CARGADA ==========
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('show-detail.html') || window.location.search.includes('id=')) {
        iniciarPaginaDetalle();
    } else {
        iniciarPaginaPrincipal();
    }
});
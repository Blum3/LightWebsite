// script.js

// 1. Initialisation de l'état global (équivalent de useState)
let state = {
    items: ITEMS_DATA, // Vient de data.js
    filteredItems: ITEMS_DATA,
    currentItem: ITEMS_DATA[0],
    searchTerm: "",
    selectedCategories: new Set(),
    selectedThemes: new Set(),
    showExpired: true,
};

// --- Fonctions utilitaires ---
function normalizeString(str) {
    // Supprime les espaces et remplace les accents pour les IDs et les classes
    return str.replace(/\s/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function formatDate(dateString) {
    if (!dateString) return "Pas de date de fin";
    const date = new Date(dateString);
    const now = new Date();
    const formattedDate = date.toLocaleDateString('fr-FR');

    return date >= now
        ? `Ouvert jusqu'au : ${formattedDate}`
        : `Terminé depuis : ${formattedDate}`;
}

// --- Logique du Filtre (FilterSidebar) ---

function getUniqueCategoriesAndThemes(items) {
    const categories = new Set();
    const themes = new Set();
    items.forEach(item => {
        item.categories.forEach(cat => categories.add(cat));
        item.themes.forEach(theme => themes.add(theme));
    });
    return { categories: Array.from(categories).sort(), themes: Array.from(themes).sort() };
}

function filterItems() {
    const { items, searchTerm, selectedCategories, selectedThemes, showExpired } = state;
    
    const filtered = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCategories = selectedCategories.size === 0 || 
                                  item.categories.some(cat => selectedCategories.has(cat));
                                  
        const matchesThemes = selectedThemes.size === 0 || 
                              item.themes.some(theme => selectedThemes.has(theme));
                              
        let matchesExpiration = true;
        if (item.until) {
            // Créer un objet Date en utilisant le format YYYY-MM-DD
            const itemDate = new Date(item.until);
            const now = new Date();
            matchesExpiration = showExpired || itemDate >= now;
        }

        return matchesSearch && matchesCategories && matchesThemes && matchesExpiration;
    });

    state.filteredItems = filtered;
    renderItems(filtered);
}

function handleFilterClick(e, type) {
    const value = e.target.getAttribute('data-value');
    if (!value) return;

    let selectedSet = type === 'category' ? state.selectedCategories : state.selectedThemes;

    if (value === 'all') {
        selectedSet.clear();
    } else {
        if (selectedSet.has(value)) {
            selectedSet.delete(value);
        } else {
            selectedSet.add(value);
        }
    }
    
    // Mise à jour de l'UI et refiltrage
    renderFilterSidebar(); 
    filterItems();
}

function toggleShowExpired() {
    state.showExpired = !state.showExpired;
    // Mise à jour de l'UI du filtre
    renderFilterSidebar();
    filterItems();
}

function handleSearch(event) {
    state.searchTerm = event.target.value;
    filterItems();
}

// --- Logique de l'Item Sidebar ---

function handleChangeItem(item) {
    state.currentItem = item;
    renderItemSidebar(item);

    // Afficher la sidebar
    document.getElementById('item-sidebar').style.display = 'block';
}

function hideItemSidebar() {
    // Masquer la sidebar
    document.getElementById('item-sidebar').style.display = 'none';
}

// --- Fonctions de Rendu (équivalent des composants) ---

function renderItems(itemsToRender) {
    const container = document.getElementById('items-main-container');
    container.innerHTML = ''; // Nettoyer l'ancien contenu

    itemsToRender.forEach(item => {
        if (item.hide) return;
        const itemLink = document.createElement('a');
        itemLink.className = 'item-clickable';
        itemLink.href = "#"; 
        // L'événement onClick dans React est remplacé par addEventListener/onclick en JS
        itemLink.onclick = (e) => { e.preventDefault(); handleChangeItem(item); };

        const itemDiv = document.createElement('div');
        itemDiv.className = 'item-img-area';
        itemDiv.innerHTML = `
            <img id="drawing" src="${item.imageRef}" alt="Missing" />
            <img id="photo" src="${item.altPhotoRef}" alt="Missing" />
        `;
        itemLink.appendChild(itemDiv);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'item-content';

        // Tags catégories
        item.categories.forEach(cat => {
            const span = document.createElement('span');
            span.className = 'category-name';
            span.textContent = cat;
            span.id = normalizeString(cat); // Pour le style CSS
            contentDiv.appendChild(span);
        });

        // Tags thèmes
        item.themes.forEach(theme => {
            const span = document.createElement('span');
            span.className = 'theme-name';
            span.textContent = theme;
            span.id = normalizeString(theme); // Pour le style CSS
            contentDiv.appendChild(span);
        });

        const title = document.createElement('h2');
        title.textContent = item.name;
        contentDiv.appendChild(title);

        itemLink.appendChild(contentDiv);
        container.appendChild(itemLink);
    });
}

function renderItemSidebar(item) {
    const sidebar = document.getElementById('item-sidebar');
    
    // Début du contenu statique
    let htmlContent = `
        <button id="hide-sidebar-button" class="back-button"> Retour </button>
        <h2>${item.name}</h2>
        <p>Imaginée par : ${item.creator}</p>
        <p>${formatDate(item.until)}</p>
        <p>A : ${item.location}</p>
        <p>${item.description}</p>
    `;

    // Rendu dynamique des sections
    item.sections.forEach(section => {
        htmlContent += `
            <div class="item-section">
                <h3>${section.title}</h3>
                <p class="section-content">${section.content}</p>
                ${section.imageRef ? `
                    <img src="${section.imageRef}" alt="Image Manquante" />
                    <p class="caption">${section.imageCaption || ''}</p>
                ` : ''}
            </div>
        `;
    });

    sidebar.innerHTML = htmlContent;
    
    // Attacher l'événement au bouton "Retour" après le rendu
    document.getElementById('hide-sidebar-button').onclick = hideItemSidebar;
}

function renderFilterSidebar() {
    const sidebar = document.getElementById('filter-sidebar');
    const { items, searchTerm, selectedCategories, selectedThemes, showExpired } = state;
    const { categories, themes } = getUniqueCategoriesAndThemes(items);

    let htmlContent = `
        <h2>Filter</h2>
        <div class="filter-section">
            <input
                type="text"
                placeholder="Search..."
                value="${searchTerm}"
                id="search-input"
                class="search-input"
            />
        </div>
        <div class="filter-section">
            <h3>Categories</h3>
            <ul id="category-list" class="category-list">
                <li 
                    class="${selectedCategories.size === 0 ? 'active' : ''}"
                    data-value="all"
                >
                    All
                </li>
                ${categories.map(category => `
                    <li
                        id="${normalizeString(category)}"
                        class="${selectedCategories.has(category) ? 'active' : ''}"
                        data-value="${category}"
                    >
                        ${category}
                    </li>
                `).join('')}
            </ul>
        </div>
        <div class="filter-section">
            <h3>Themes</h3>
            <ul id="theme-list" class="theme-list">
                <li
                    class="${selectedThemes.size === 0 ? 'active' : ''}"
                    data-value="all"
                >
                    All
                </li>
                ${themes.map(theme => `
                    <li
                        id="${normalizeString(theme)}"
                        class="${selectedThemes.has(theme) ? 'active' : ''}"
                        data-value="${theme}"
                    >
                        ${theme}
                    </li>
                `).join('')}
            </ul>
        </div>
        <div class="filter-section">
            <label>
                <input type="checkbox" id="show-expired-checkbox" ${showExpired ? 'checked' : ''} />
                Include closed experiences
            </label>
        </div>
    `;

    sidebar.innerHTML = htmlContent;

    // Attacher les écouteurs d'événements
    document.getElementById('search-input').oninput = handleSearch;
    document.getElementById('show-expired-checkbox').onchange = toggleShowExpired;
    
    // Délégation d'événements pour les listes de filtres
    document.getElementById('category-list').addEventListener('click', (e) => handleFilterClick(e, 'category'));
    document.getElementById('theme-list').addEventListener('click', (e) => handleFilterClick(e, 'theme'));
}


// --- Démarrage de l'application ---

window.onload = () => {
    // 1. Initialiser le rendu des éléments (liste des items)
    renderItems(state.items);
    
    // 2. Initialiser le rendu du panneau de filtre
    renderFilterSidebar();

    // 3. Initialiser le panneau de l'item courant avec le premier item
    // On appelle renderItemSidebar une fois pour s'assurer que le HTML est présent, même s'il est masqué par défaut.
    renderItemSidebar(state.currentItem);
};
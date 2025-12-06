document.addEventListener('DOMContentLoaded', () => {
    const vehicleListDiv = document.getElementById('vehicle-list');

    async function fetchPublicVehicles() {
        try {
            const response = await fetch('/api/public-vehicles');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const vehicles = await response.json();
            displayVehicles(vehicles);
        } catch (error) {
            console.error('Erro ao buscar veículos públicos:', error);
            vehicleListDiv.innerHTML = '<p>Não foi possível carregar os veículos públicos no momento.</p>';
        }
    }

    function displayVehicles(vehicles) {
        if (vehicles.length === 0) {
            vehicleListDiv.innerHTML = '<p>Nenhum veículo público disponível no momento.</p>';
            return;
        }

        vehicleListDiv.innerHTML = ''; // Clear previous content

        vehicles.forEach(vehicle => {
            const vehicleCard = document.createElement('div');
            vehicleCard.classList.add('vehicle-card'); // Add a class for styling

            // Determine the image based on vehicle type
            let imageUrl = '';
            switch (vehicle.tipo) {
                case 'carro':
                    imageUrl = 'imagens/carro.png';
                    break;
                case 'esportivo':
                    imageUrl = 'imagens/esportivo.png';
                    break;
                case 'caminhao':
                    imageUrl = 'imagens/caminhao.png';
                    break;
                default:
                    imageUrl = ''; // Or a default placeholder image
            }

            vehicleCard.innerHTML = `
                <img src="${imageUrl}" alt="${vehicle.modelo}" class="vehicle-image">
                <h3>${vehicle.marca} ${vehicle.modelo} (${vehicle.ano})</h3>
                <p>Placa: ${vehicle.placa}</p>
                <p>Cor: ${vehicle.cor}</p>
                <p>Tipo: ${vehicle.tipo}</p>
                ${vehicle.tipo === 'caminhao' ? `<p>Carga Atual: ${vehicle.cargaAtual}/${vehicle.capacidadeCarga} kg</p>` : ''}
                <p class="${vehicle.ligado ? 'status-ligado' : 'status-desligado'}">Status: ${vehicle.ligado ? 'Ligado' : 'Desligado'}</p>
            `;
            vehicleListDiv.appendChild(vehicleCard);
        });
    }

    fetchPublicVehicles();
});

document.addEventListener('DOMContentLoaded', () => {
    const desks = document.querySelectorAll('.desk');
    const modal = document.getElementById('reservation-modal');
    const closeModal = document.querySelector('.close');
    const form = document.getElementById('reservation-form');
    const deskNumberSpan = document.getElementById('desk-number');
    const cancelButton = document.getElementById('cancel-reservation');
    const errorMessage = document.getElementById('error-message');
    let currentDesk = null;
    const reservations = {};

    // URL do Google Apps Script (substitua pelo seu URL)
    const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbxqHAk2SUHNT8aFtygAsaSaX3fjW-7i3MSjove-H5GDkQRVAHqnkT5OCBSXEllV3ZJ_lA/exec'; // Exemplo: https://script.google.com/macros/s/ABC123/exec

    // Carregar reservas existentes
    async function loadReservations() {
        try {
            const response = await fetch(googleScriptUrl, {
                method: 'POST',
                body: JSON.stringify({ action: 'load' }),
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.status === 'success') {
                result.reservations.forEach(res => {
                    reservations[res.desk] = {
                        name: res.name,
                        date: res.date,
                        startTime: res.startTime,
                        endTime: res.endTime
                    };
                    const desk = document.querySelector(`.desk[data-desk="${res.desk}"]`);
                    if (desk) {
                        desk.classList.remove('available');
                        desk.classList.add('reserved');
                        desk.textContent = `Reservado: ${res.name}`;
                    }
                });
            } else {
                console.error('Erro ao carregar reservas:', result.message);
            }
        } catch (error) {
            console.error('Erro ao conectar com Google Sheets:', error);
        }
    }

    // Inicializar carregando reservas
    loadReservations();

    // Abrir modal ao clicar em uma mesa
    desks.forEach(desk => {
        desk.addEventListener('click', () => {
            currentDesk = desk;
            const deskId = desk.getAttribute('data-desk');
            deskNumberSpan.textContent = deskId;
            errorMessage.style.display = 'none';

            // Preencher formulário se a mesa já estiver reservada
            if (reservations[deskId]) {
                document.getElementById('user-name').value = reservations[deskId].name;
                document.getElementById('reservation-date').value = reservations[deskId].date;
                document.getElementById('start-time').value = reservations[deskId].startTime;
                document.getElementById('end-time').value = reservations[deskId].endTime;
                cancelButton.style.display = 'block';
            } else {
                document.getElementById('reservation-form').reset();
                cancelButton.style.display = 'none';
            }

            modal.style.display = 'block';
        });
    });

    // Fechar modal ao clicar no "X"
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
        form.reset();
        errorMessage.style.display = 'none';
    });

    // Fechar modal ao clicar fora
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            form.reset();
            errorMessage.style.display = 'none';
        }
    });

    // Confirmar reserva
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const deskId = currentDesk.getAttribute('data-desk');
        const name = document.getElementById('user-name').value;
        const date = document.getElementById('reservation-date').value;
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;

        // Validar horário (hora final deve ser após hora inicial)
        if (startTime >= endTime) {
            errorMessage.textContent = 'A hora final deve ser após a hora inicial.';
            errorMessage.style.display = 'block';
            return;
        }

        // Preparar dados para enviar ao Google Apps Script
        const reservationData = {
            action: 'reserve',
            desk: deskId,
            name: name,
            date: date,
            startTime: startTime,
            endTime: endTime
        };

        try {
            // Enviar dados para o Google Apps Script
            const response = await fetch(googleScriptUrl, {
                method: 'POST',
                body: JSON.stringify(reservationData),
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await response.json();

            if (result.status === 'success') {
                // Salvar reserva localmente
                reservations[deskId] = { name, date, startTime, endTime };
                currentDesk.classList.remove('available');
                currentDesk.classList.add('reserved');
                currentDesk.textContent = `Reservado: ${name}`;
                modal.style.display = 'none';
                form.reset();
                errorMessage.style.display = 'none';
                alert('Reserva salva com sucesso!');
            } else {
                errorMessage.textContent = result.message;
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            errorMessage.textContent = 'Erro ao conectar com o Google Sheets: ' + error.message;
            errorMessage.style.display = 'block';
        }
    });

    // Cancelar reserva
    cancelButton.addEventListener('click', async () => {
        const deskId = currentDesk.getAttribute('data-desk');
        const reservation = reservations[deskId];

        try {
            const response = await fetch(googleScriptUrl, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'cancel',
                    desk: deskId,
                    date: reservation.date,
                    startTime: reservation.startTime
                }),
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await response.json();

            if (result.status === 'success') {
                delete reservations[deskId];
                currentDesk.classList.remove('reserved');
                currentDesk.classList.add('available');
                currentDesk.textContent = 'Disponível';
                modal.style.display = 'none';
                form.reset();
                errorMessage.style.display = 'none';
                alert('Reserva cancelada com sucesso!');
            } else {
                errorMessage.textContent = result.message;
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            errorMessage.textContent = 'Erro ao cancelar a reserva: ' + error.message;
            errorMessage.style.display = 'block';
        }
    });

    // Inicializar mesas como disponíveis
    desks.forEach(desk => {
        desk.classList.add('available');
    });
});

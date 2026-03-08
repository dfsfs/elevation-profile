let map;
let polyline;
let chart;
let chartPreview = null;
let dadosPerfil = [];
let previewPerfil = [];


let alturaEmissora = 0; // metros acima do terreno
let alturaReceptora = 0;
let freqGHz = 10;


document.addEventListener("DOMContentLoaded", () => {
    initMap();
});

// Controle do ponto que será definido no clique (A ou B)
let pontoAtual = "A";

// Ícones mapa
let startIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25,41],
    iconAnchor: [12,41]
});

let endIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25,41],
    iconAnchor: [12,41]
});

// Inicialização do mapa
function initMap(){
    map = L.map('map').setView([38.7169, -9.1391], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{ maxZoom:19 }).addTo(map);

    // Clique no mapa para definir pontos
    map.on('click', function(e){
        const {lat, lng} = e.latlng;

        if(pontoAtual === "A"){
            document.getElementById("lat1").value = lat.toFixed(6);
            document.getElementById("lng1").value = lng.toFixed(6);

            if(window.markerStart) map.removeLayer(window.markerStart);
            window.markerStart = L.marker([lat,lng], {icon:startIcon, draggable:true}).addTo(map).bindPopup("Ponto Inicial").openPopup();
            window.markerStart.on('drag', atualizarLinha);

            pontoAtual = "B"; // próximo clique define ponto B
        } else {
            document.getElementById("lat2").value = lat.toFixed(6);
            document.getElementById("lng2").value = lng.toFixed(6);

            if(window.markerEnd) map.removeLayer(window.markerEnd);
            window.markerEnd = L.marker([lat,lng], {icon:endIcon, draggable:true}).addTo(map).bindPopup("Ponto Final").openPopup();
            window.markerEnd.on('drag', atualizarLinha);

            pontoAtual = "A"; // volta para A
        }

        if(window.markerStart && window.markerEnd){
            atualizarLinha();
            gerarPreview()
        }
    });
}

function atualizarMarcadorFinal() {
    const lat = parseFloat(document.getElementById("lat2").value);
    const lng = parseFloat(document.getElementById("lng2").value);
    if (isNaN(lat) || isNaN(lng)) return;

    const latlng = L.latLng(lat, lng);

    // Remove antigo marker
    if (window.markerEnd) map.removeLayer(window.markerEnd);

    // Cria novo marker final
    window.markerEnd = L.marker(latlng, { icon: endIcon, draggable: true }).addTo(map).bindPopup("Ponto Final");

    // Se houver marcador inicial, gera preview
    if (window.markerStart) {
        gerarPreview();  // força a criação do preview no chart
    }

    // Atualiza linha no mapa
    if (window.markerStart) atualizarLinha();

    // Adiciona evento de drag para atualizar preview quando o utilizador arrasta
    window.markerEnd.on('drag', function(e) {
        const pos = e.target.getLatLng();
        document.getElementById("lat2").value = pos.lat.toFixed(6);
        document.getElementById("lng2").value = pos.lng.toFixed(6);
        gerarPreview();
        atualizarLinha();
    });
}

// Atualiza linha e distância no mapa
function atualizarLinha(){
    if(polyline) map.removeLayer(polyline);
    polyline = L.polyline([window.markerStart.getLatLng(), window.markerEnd.getLatLng()]).addTo(map);
    map.fitBounds(polyline.getBounds());

    const dist = window.markerStart.getLatLng().distanceTo(window.markerEnd.getLatLng())/1000;
    document.getElementById("distancia").textContent = dist.toFixed(2) + " km";
}

// Atualiza marcadores quando o utilizador altera os inputs manualmente
function atualizarMarcadores(){
    const lat1 = parseFloat(document.getElementById("lat1").value);
    const lng1 = parseFloat(document.getElementById("lng1").value);
    const lat2 = parseFloat(document.getElementById("lat2").value);
    const lng2 = parseFloat(document.getElementById("lng2").value);

    if(window.markerStart) window.markerStart.setLatLng([lat1,lng1]);
    if(window.markerEnd) window.markerEnd.setLatLng([lat2,lng2]);

    if(window.markerStart && window.markerEnd){
        atualizarLinha();
    }
}

["lat1","lng1","lat2","lng2"].forEach(id => {
    document.getElementById(id).addEventListener("input", atualizarMarcadores);
});

function atualizarLinha(){
    if(polyline) map.removeLayer(polyline);

    const latlngs = [window.markerStart.getLatLng(), window.markerEnd.getLatLng()];
    polyline = L.polyline(latlngs).addTo(map);
    map.fitBounds(polyline.getBounds());

    const dist = window.markerStart.getLatLng().distanceTo(window.markerEnd.getLatLng())/1000;
    const distText = dist.toFixed(2) + " km";

    // Atualiza campo de distância
    document.getElementById("distancia").textContent = distText;

    // Mostrar tooltip no centro da linha
    polyline.bindTooltip(distText, {permanent:true, className:'distTooltip', offset:[0,-10]}).openTooltip();
}

function resetPoints() {

    // remover marcadores
    if(window.markerStart) map.removeLayer(window.markerStart);
    if(window.markerEnd) map.removeLayer(window.markerEnd);
    if(polyline) map.removeLayer(polyline);

    window.markerStart = null;
    window.markerEnd = null;
    polyline = null;

    pontoAtual = "A";

    // limpar inputs
    document.getElementById("lat1").value = "";
    document.getElementById("lng1").value = "";
    document.getElementById("lat2").value = "";
    document.getElementById("lng2").value = "";

    // limpar estatísticas
    document.getElementById("distancia").textContent = "—";
    document.getElementById("numPontos").textContent = "—";
    document.getElementById("elevMin").textContent = "—";
    document.getElementById("elevMax").textContent = "—";
    document.getElementById("ligacao").textContent = "—";

    // limpar estruturas de dados
    previewPerfil = [];
    dadosPerfil = [];

    // destruir gráfico preview
    if (chartPreview) {
        chartPreview.destroy();
        chartPreview = null;
    }

    // destruir gráfico final
    if (chart) {
        chart.destroy();
        chart = null;
    }

    // limpar tabela
    const tabela = document.getElementById("output");
    if(tabela) tabela.innerHTML = "";

    // reset barra de progresso
    document.getElementById("progress").innerText = "0 / 0";
    document.getElementById("progressFill").style.width = "0%";

}

// Função para gerar preview simplificado
async function gerarPreview() {
    if (!window.markerStart || !window.markerEnd) return;

    bloquearControlesPreview(true);

    const p1 = window.markerStart.getLatLng();
    const p2 = window.markerEnd.getLatLng();
    const distTotal = p1.distanceTo(p2);

    const passo = 1500; // 1 km
    const samples = Math.max(Math.ceil(distTotal / passo), 5);

    const latitudes = [];
    const longitudes = [];
    const distKm = [];

    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        latitudes.push(p1.lat + (p2.lat - p1.lat) * t);
        longitudes.push(p1.lng + (p2.lng - p1.lng) * t);
        distKm.push((distTotal * t) / 1000);
    }

    // Simular elevação para preview rápido
    const elevs = latitudes.map(() => Math.floor(Math.random() * 100 + 50));

    previewPerfil = distKm.map((d, i) => ({ dist: d, elev: elevs[i] }));

    desenharPreviewGrafico();
}

// Desenhar preview no chart
function desenharPreviewGrafico() {

    if (!previewPerfil || previewPerfil.length === 0) return;

    const elevs = previewPerfil.map(p => p.elev);
    const labels = previewPerfil.map((_, i) => i + 1);

    const alturaA = elevs[0];
    const alturaB = elevs[elevs.length - 1];

    const distancias = labels;

    const los = distancias.map((d,i)=>{
        return alturaA + (alturaB-alturaA)*(i/(distancias.length-1));
    });

    const ctx = document.getElementById("chart").getContext("2d");

    if (chartPreview) chartPreview.destroy();

    chartPreview = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [

                {
                    label: 'Preview Elevação',
                    data: elevs,
                    backgroundColor: 'rgba(255,165,0,0.5)',
                    barThickness: 6
                },

                {
                    type: 'line',
                    label: 'LOS',
                    data: los,
                    borderColor: 'red',
                    borderDash: [6,6],
                    fill: false,
                    pointRadius: 0
                },

                {
                    type: 'line',
                    label: 'Antenas',
                    data: [
                        {x: labels[0], y: alturaA},
                        {x: labels[labels.length-1], y: alturaB}
                    ],
                    showLine:false,
                    pointRadius:6,
                    pointBackgroundColor:"blue",
                    pointBorderColor:"white",
                    pointBorderWidth:2
                }

            ]
        },
        options: {
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Pontos' },
                    grid: { display: false }
                },
                y: {
                    title: { display: true, text: 'Elevação (m)' },
                    grid: { display: false }
                }
            }
        }
    });

}

function adicionarMarcadorFinal(latlng) {
    if (window.markerEnd) map.removeLayer(window.markerEnd);
    window.markerEnd = L.marker(latlng, { icon: endIcon }).addTo(map).bindPopup("Ponto final");
    if (window.markerStart) {
        gerarPreview();
    }
}



function calcularPerfil(){
    if(chartPreview) { chartPreview.destroy(); chartPreview = null; } // limpa preview
    previewPerfil = [];
    bloquearControlesPreview(false);

    const lat1 = parseFloat(document.getElementById("lat1").value);
    const lng1 = parseFloat(document.getElementById("lng1").value);
    const lat2 = parseFloat(document.getElementById("lat2").value);
    const lng2 = parseFloat(document.getElementById("lng2").value);

    if(lat1 === lat2 && lng1 === lng2){
        alert("Os pontos inicial e final não podem ser iguais.");
        return;
    }

    if(
        isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2) ||
        lat1 < -90 || lat1 > 90 ||
        lat2 < -90 || lat2 > 90 ||
        lng1 < -180 || lng1 > 180 ||
        lng2 < -180 || lng2 > 180
    ){
        alert("Por favor introduza coordenadas válidas.\n\nLatitude: -90 a 90\nLongitude: -180 a 180");
        return;
    }

    const p1 = L.latLng(lat1,lng1);
    const p2 = L.latLng(lat2,lng2);

    if(polyline) map.removeLayer(polyline);
    polyline = L.polyline([p1,p2]).addTo(map);
    map.fitBounds(polyline.getBounds());

    if(window.markerStart) map.removeLayer(window.markerStart);
    if(window.markerEnd) map.removeLayer(window.markerEnd);

    window.markerStart = L.marker(p1,{icon:startIcon, draggable:true}).addTo(map).bindPopup("Ponto inicial");
    window.markerEnd = L.marker(p2,{icon:endIcon, draggable:true}).addTo(map).bindPopup("Ponto final");

    window.markerStart.on('drag', atualizarLinha);
    window.markerEnd.on('drag', atualizarLinha);

    gerarPontos(p1,p2);
}

function gerarPontos(p1,p2){
    dadosPerfil=[];
    const dist = p1.distanceTo(p2);
    const passo = 250;
    let samples = Math.ceil(dist/passo);
    if(samples<2) samples=2;

    const latitudes=[], longitudes=[], distancias=[];
    for(let i=0;i<=samples;i++){
        const t = i/samples;
        latitudes.push(p1.lat + (p2.lat - p1.lat)*t);
        longitudes.push(p1.lng + (p2.lng - p1.lng)*t);
        distancias.push((dist*t)/1000);
    }

    pedirElevacoes(latitudes,longitudes,distancias);
}

async function pedirElevacoes(lats,lngs,distancias){
    const tabela = document.querySelector("#output");
    tabela.innerHTML = "";
    dadosPerfil=[];

    for(let i=0;i<lats.length;i++){
        const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats[i]}&longitude=${lngs[i]}`;
        const res = await fetch(url);
        const data = await res.json();
        const elev = data.elevation;

        dadosPerfil.push({
            dist: distancias[i],
            elev: elev,
            lat: lats[i],
            lng: lngs[i]
        });

        const tr = document.createElement("tr");
        tr.innerHTML=`<td>${i+1}</td><td>${distancias[i].toFixed(2)}</td><td>${elev}</td><td>${lats[i].toFixed(6)}</td><td>${lngs[i].toFixed(6)}</td>`;
        tabela.appendChild(tr);

        updateProgress(i+1, lats.length);
    }

    const p1 = L.latLng(lats[0],lngs[0]);
    const p2 = L.latLng(lats[lats.length-1],lngs[lngs.length-1]);
    const dist = p1.distanceTo(p2);

    atualizarInfoLigacao(p1,p2,lats.length-1);  
    desenharGrafico();
}

function desenharGrafico(){
    const n = dadosPerfil.length;
    if(n===0) return;

    const elev = dadosPerfil.map(p => p.elev); 
    const distanciasKm = dadosPerfil.map(p => p.dist); 
    const yMin = Math.ceil(Math.min(...elev) - 10)
    const yMax = Math.ceil(Math.max(...elev) + 50);

    const ctx = document.getElementById("chart");
    if(chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: elev.map((_, i) => i+1),
            datasets: [{
                label: 'Elevação do terreno',
                data: elev,
                backgroundColor: elev.map(()=> '#bfbfbf'),
                barThickness: 6
            }]
        },
        options: {
            plugins: { 
                legend: { display: false }, 
                tooltip: { enabled:true }  
            },
            scales: {
                x: { title:{display:true,text:'Pontos'}, grid:{display:false} },
                y: { type:'linear', min: yMin, max: yMax, title:{display:true,text:'Elevação (m)'}, grid:{display:false} }
            }
        },
        plugins:[{
          id:'LoS_Fresnel',
          afterDatasetsDraw: chart => {
              const {ctx, scales:{x, y}} = chart;

              const freq = freqGHz * 1e9; // converter GHz -> Hz
              const D = distanciasKm[n-1]*1000;
      
              const topoEmissora = (parseInt(elev[0], 10)) + alturaEmissora;
              const topoReceptora = (parseInt(elev[n-1], 10)) + alturaReceptora;

              const yLoS = [];
              const yFresnelSup = [];
              const yFresnelInf = [];

              for(let i=0;i<n;i++){
                  const z = distanciasKm[i]*1000;
                  const r = calcularFresnel(z, D, freq);
                  const los = topoEmissora + (topoReceptora - topoEmissora)*(i/(n-1));
                  yLoS.push(los);
                  yFresnelSup.push(los + r);
                  yFresnelInf.push(los - r);
              }

              // Área Fresnel
              ctx.save();
              ctx.beginPath();
              for(let i=0;i<n;i++){
                  const xPos = x.getPixelForValue(i);
                  const yPos = y.getPixelForValue(yFresnelSup[i]);
                  if(i===0) ctx.moveTo(xPos, yPos);
                  else ctx.lineTo(xPos, yPos);
              }
              for(let i=n-1;i>=0;i--){
                  const xPos = x.getPixelForValue(i);
                  const yPos = y.getPixelForValue(yFresnelInf[i]);
                  ctx.lineTo(xPos, yPos);
              }
              ctx.closePath();
              ctx.fillStyle = 'rgba(0,255,0,0.15)';
              ctx.fill();
              ctx.restore();

              // Limites Fresnel
              ctx.save();
              ctx.strokeStyle = 'green';
              ctx.lineWidth = 1.5;
              // Superior
              ctx.beginPath();
              for(let i=0;i<n;i++){
                  const xPos = x.getPixelForValue(i);
                  const yPos = y.getPixelForValue(yFresnelSup[i]);
                  if(i===0) ctx.moveTo(xPos, yPos);
                  else ctx.lineTo(xPos, yPos);
              }
              ctx.stroke();
              // Inferior
              ctx.beginPath();
              for(let i=0;i<n;i++){
                  const xPos = x.getPixelForValue(i);
                  const yPos = y.getPixelForValue(yFresnelInf[i]);
                  if(i===0) ctx.moveTo(xPos, yPos);
                  else ctx.lineTo(xPos, yPos);
              }
              ctx.stroke();
              ctx.restore();

              // LoS
              ctx.save();
              ctx.strokeStyle = 'green';
              ctx.lineWidth = 2;
              ctx.beginPath();
              for(let i=0;i<n;i++){
                  const xPos = x.getPixelForValue(i);
                  const yPos = y.getPixelForValue(yLoS[i]);
                  if(i===0) ctx.moveTo(xPos, yPos);
                  else ctx.lineTo(xPos, yPos);
              }
              ctx.stroke();
              ctx.restore();

              // Antenas no topo da antena
              const pontos = [
                  {index:0,color:'red',altura: alturaEmissora},
                  {index:n-1,color:'blue',altura: alturaReceptora}
              ];
              pontos.forEach(p => {
                  const xPos = x.getPixelForValue(p.index);
                  const yPos = y.getPixelForValue((parseInt(elev[p.index], 10)) + p.altura); // topo da antena
                  ctx.save();
                  ctx.beginPath();
                  ctx.fillStyle = p.color;
                  ctx.arc(xPos, yPos, 6, 0, 2*Math.PI);
                  ctx.fill();
                  ctx.restore();

                  // Altura da antena
                  if(p.altura>0){
                      const yBase = y.getPixelForValue(parseInt(elev[p.index], 10));
                      const yTop = y.getPixelForValue((parseInt(elev[p.index], 10)) + p.altura);
                      ctx.save();
                      ctx.fillStyle = 'rgba(0,0,255,0.2)';
                      ctx.fillRect(xPos-3, yTop, 6, yBase - yTop);
                      ctx.restore();
                  }
              });
          }
      }]
    });
}
function calcularFresnel(z, D, freqHz){
    const lambda = 3e8 / freqHz; // comprimento de onda
    return Math.sqrt((z * (D - z) / D) * lambda); // raio do elipsoide em metros
}

// Downloads
function downloadTXT(){
    let txt="";
    dadosPerfil.forEach(p => txt+=p.dist.toFixed(2)+"\t"+p.elev+"\n");
    const blob = new Blob([txt]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "perfil_feixer.txt";
    a.click();
}

function downloadCSV(){
    let csv="id\tdistancia_km\tlatitude\tlongitude\televacao_m\n";
    dadosPerfil.forEach((p,i)=>csv+=(i+1)+"\t"+p.dist.toFixed(2)+"\t"+p.lat+"\t"+p.lng+"\t"+p.elev+"\n");
    const blob = new Blob([csv]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "perfil_elevacao.csv";
    a.click();
}

function updateProgress(done,total){
    document.getElementById("progress").innerText=done+" / "+total;
    document.getElementById("progressFill").style.width=(done/total*100)+"%";
}

const hoje = new Date();
document.getElementById("data").textContent = hoje.toLocaleDateString('pt-PT');

async function obterLocalidade(lat,lng){
    try{
        const url=`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
        const res=await fetch(url);
        const data=await res.json();

        const addr=data.address;
        return addr.city || addr.town || addr.village || addr.hamlet || "Local desconhecido";
    }catch{
        return "Local desconhecido";
    }
}

async function atualizarInfoLigacao(p1,p2,samples){
    const loc1 = await obterLocalidade(p1.lat,p1.lng);
    const loc2 = await obterLocalidade(p2.lat,p2.lng);

    document.getElementById("ligacao").textContent = "Ligação entre "+ loc1 +" e "+ loc2;
    document.getElementById("distancia").textContent = (p1.distanceTo(p2)/1000).toFixed(2)+" km";
    document.getElementById("numPontos").textContent = samples+1;

    if(dadosPerfil.length>0){
        const elevacoes = dadosPerfil.map(p=>p.elev);
        document.getElementById("elevMin").textContent = Math.min(...elevacoes)+" m";
        document.getElementById("elevMax").textContent = Math.max(...elevacoes)+" m";
    }
}

function bloquearControlesPreview(bloquear){

    document.getElementById("inputEmissora").disabled = bloquear;
    document.getElementById("inputFreq").disabled = bloquear;
    document.getElementById("inputReceptora").disabled = bloquear;

}

inputEmissora.addEventListener("input", () => {
    alturaEmissora = parseInt(inputEmissora.value, 10) || 0;
    if(alturaEmissora > 50){
        alturaEmissora = 50;
        avisoEmissora.textContent = "Altura máxima 50 m";
    } else {
        avisoEmissora.textContent = "";
    }
    if(alturaEmissora < 0) alturaEmissora = 0;
    if (dadosPerfil.length > 0) {
        if (dadosPerfil[0].elevOriginal === undefined) {
            dadosPerfil[0].elevOriginal = parseFloat(dadosPerfil[0].elev); // Garantir que é número
        }
        dadosPerfil[0].elev = dadosPerfil[0].elevOriginal + alturaEmissora;
        desenharGrafico();
    }
});

inputReceptora.addEventListener("input", () => {
    alturaReceptora = parseInt(inputReceptora.value, 10) || 0;
    if(alturaReceptora > 50){
        alturaReceptora = 50;
        avisoReceptora.textContent = "Altura máxima 50 m";
    } else {
        avisoReceptora.textContent = "";
    }

    if(alturaReceptora < 0) alturaReceptora = 0;
    if (dadosPerfil.length > 0) {
        const n = dadosPerfil.length - 1;
        if (dadosPerfil[n].elevOriginal === undefined) {
            dadosPerfil[n].elevOriginal = parseFloat(dadosPerfil[n].elev); // Garantir que é número
        }
        dadosPerfil[n].elev = dadosPerfil[n].elevOriginal + alturaReceptora;
        desenharGrafico();
    }
});

inputFreq.addEventListener("input", () => {
    freqGHz = parseInt(inputFreq.value, 10) || 1;
     if(freqGHz > 20){
        freqGHz = 20;
        avisoFrequencia.textContent = "Frequência máxima 20 Ghz";
    } else {
        avisoFrequencia.textContent = "";
    }
    if(freqGHz < 1) freqGHz = 1;
    // Atualiza o gráfico
    if(dadosPerfil.length > 0){
        desenharGrafico();
    }
});

document.getElementById("lat2").addEventListener("change", atualizarMarcadorFinal);
document.getElementById("lng2").addEventListener("change", atualizarMarcadorFinal);



const avisoEmissora = document.createElement("span");
avisoEmissora.style.color = "#d9534f"; 
avisoEmissora.style.fontSize = "12px";
inputEmissora.parentNode.appendChild(avisoEmissora);

const avisoReceptora = document.createElement("span");
avisoReceptora.style.color = "#d9534f";
avisoReceptora.style.fontSize = "12px";
inputReceptora.parentNode.appendChild(avisoReceptora);

const avisoFrequencia = document.createElement("span");
avisoFrequencia.style.color = "#d9534f"; 
avisoFrequencia.style.fontSize = "12px";
inputFreq.parentNode.appendChild(avisoFrequencia);

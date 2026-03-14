
let rawData=[]
let cleanData=[]

fetch("ventas_raw.csv")
.then(res=>res.text())
.then(text=>{

const rows=text.trim().split("\n").slice(1)

rawData=rows.map(r=>r.split(","))

document.getElementById("rawCount").textContent=rawData.length

limpiarDatos()

mostrarTablas()

calcularKPIs()

})

function limpiarDatos(){

const seen=new Set()

rawData.forEach(r=>{

let [fecha,franja,producto,familia,unidades,precio,importe]=r

if(!fecha || isNaN(Date.parse(fecha))) return

franja=franja.trim().toLowerCase()

if(franja.includes("desayuno")) franja="Desayuno"
else if(franja.includes("comida")) franja="Comida"
else return

familia=familia.trim().toLowerCase()

if(familia.includes("bebida")) familia="Bebida"
else if(familia.includes("entrante")) familia="Entrante"
else if(familia.includes("principal")) familia="Principal"
else if(familia.includes("postre")) familia="Postre"
else return

producto=producto.trim()

if(producto==="") return

unidades=parseFloat(unidades)
precio=parseFloat(precio)

if(unidades<=0 || precio<=0) return

importe=unidades*precio

const key=[fecha,franja,producto,familia,unidades,precio].join("-")

if(seen.has(key)) return

seen.add(key)

cleanData.push({
fecha,
franja,
producto,
familia,
unidades,
precio,
importe
})

})

document.getElementById("cleanCount").textContent=cleanData.length

}

function mostrarTablas(){

const rawTable=document.getElementById("tablaRaw")
const cleanTable=document.getElementById("tablaClean")

rawTable.innerHTML="<tr><th>fecha</th><th>franja</th><th>producto</th><th>familia</th><th>unidades</th><th>precio</th><th>importe</th></tr>"

rawData.slice(0,10).forEach(r=>{
rawTable.innerHTML+=`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`
})

cleanTable.innerHTML="<tr><th>fecha</th><th>franja</th><th>producto</th><th>familia</th><th>unidades</th><th>precio</th><th>importe</th></tr>"

cleanData.slice(0,10).forEach(r=>{
cleanTable.innerHTML+=`<tr>
<td>${r.fecha}</td>
<td>${r.franja}</td>
<td>${r.producto}</td>
<td>${r.familia}</td>
<td>${r.unidades}</td>
<td>${r.precio}</td>
<td>${r.importe.toFixed(2)}</td>
</tr>`
})

}

function calcularKPIs(){

let ventas=0
let unidades=0

let franja={}
let familia={}
let productos={}

cleanData.forEach(r=>{

ventas+=r.importe
unidades+=r.unidades

franja[r.franja]=(franja[r.franja]||0)+r.importe
familia[r.familia]=(familia[r.familia]||0)+r.importe
productos[r.producto]=(productos[r.producto]||0)+r.importe

})

document.getElementById("ventasTotales").textContent=ventas.toFixed(2)+" €"
document.getElementById("unidadesTotales").textContent=unidades

const topProductos=Object.entries(productos)
.sort((a,b)=>b[1]-a[1])
.slice(0,5)

crearGrafico("topProductos",
topProductos.map(p=>p[0]),
topProductos.map(p=>p[1]))

crearGrafico("ventasFranja",
Object.keys(franja),
Object.values(franja))

crearGrafico("ventasFamilia",
Object.keys(familia),
Object.values(familia))

}

function crearGrafico(id,labels,data){

new Chart(document.getElementById(id),{
type:"bar",
data:{
labels:labels,
datasets:[{
label:"Ventas €",
data:data
}]
}
})

}

function descargarCSV(){

let csv="fecha,franja,producto,familia,unidades,precio,importe\n"

cleanData.forEach(r=>{
csv+=`${r.fecha},${r.franja},${r.producto},${r.familia},${r.unidades},${r.precio},${r.importe}\n`
})

const blob=new Blob([csv])

const a=document.createElement("a")

a.href=URL.createObjectURL(blob)

a.download="ventas_clean.csv"

a.click()

}

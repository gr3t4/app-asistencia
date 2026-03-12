const today   = () => new Date().toISOString().split("T")[0];
const fmtDate = (d) => new Date(d+"T12:00:00").toLocaleDateString("es-MX",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
const fmtDT   = (iso) => new Date(iso).toLocaleDateString("es-MX",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});

export {
    today,
    fmtDate,
    fmtDT
}
import C from "./styles.config";

const STATUS = {
    present: { label:"Presente",   icon:"✅", color:C.success, short:"P", bg:"#10b98122" },
    absent:  { label:"Ausente",    icon:"❌", color:C.danger,  short:"F", bg:"#ef444422" },
    late:    { label:"Retardo",    icon:"🕐", color:C.late,    short:"R", bg:"#f9731622" },
    excused: { label:"Justificada",icon:"📝", color:C.excused, short:"J", bg:"#06b6d422" },
    pending: { label:"Sin reg.",   icon:"⏳", color:C.muted,   short:"-", bg:"#64748b22" },
};

export default STATUS;
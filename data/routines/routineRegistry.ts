import { Routine } from "@/types/routine";
import { fullBodyFuncional } from "../routes/fullBodyFuncional";
import { rutinaFuncionalAlternativa } from "../routes/rutinaFuncionalAlternativa";

export const routineRegistry: Record<string, Routine> = {
  "full-body-funcional": fullBodyFuncional,
  "rutina-funcional-alternativa": rutinaFuncionalAlternativa,
};

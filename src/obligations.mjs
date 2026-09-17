// Undated operational checklist requested by DENTEC, informed by Foz 2026.
// Historical dates are deliberately excluded. Applicability is reviewed separately.
export function activityChecklist(state){
 const rows=[];
 const add=(id,name)=>rows.push({id,name});
 const stages=Number(state.assessmentStages);
 if([2,3,4].includes(stages))for(let n=1;n<=stages;n++){
  add(`stage-start-${n}`,`Início da ${n}ª etapa de avaliação`);
  add(`stage-end-${n}`,`Término da ${n}ª etapa de avaliação`);
  add(`results-${n}`,`Prazo de lançamento dos resultados (rendimento e frequência) da ${n}ª etapa`);
  add(`council-${n}`,`Conselho de classe/coletivo pedagógico da ${n}ª etapa`);
 }
 const terms=state.regime==='semestral'?[1,2]:[0];
 for(const n of terms){
  const label=n?`${n}º semestre`:'ano letivo';
  add(`final-${n}`,`Prazo de lançamento do resultado final (rendimento e frequência) do ${label}`);
  add(`diary-${n}`,`Prazo de fechamento e entrega dos diários de classe do ${label}`);
  add(`teaching-plan-${n}`,`Prazo de entrega do Plano de Ensino do ${label}`);
  add(`recognition-${n}`,`Aproveitamento de estudos, certificação de conhecimentos e equivalência de estágio — ${label}`);
 }
 for(const n of [1,2]){
  add(`pit-${n}`,`Prazo de entrega do PIT — ${n}º semestre`);
  add(`enrolment-${n}`,`Rematrícula dos estudantes — ${n}º semestre`);
  add(`adjustment-${n}`,`Ajuste de matrículas dos veteranos — ${n}º semestre`);
  add(`withdrawal-${n}`,`Prazo de trancamento de curso e cancelamento de matrícula em componente — ${n}º semestre`);
 }
 return rows;
}

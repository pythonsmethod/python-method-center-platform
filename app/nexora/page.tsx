import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { PRIMARY_FOUNDER_EMAIL } from "@/lib/auth/require-founder";
import styles from "./nexora.module.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "NEXORA — Anna Dubrovenko",
  description: "NEXORA is Anna Dubrovenko's living AI ecosystem: one evolving core, many specialized systems.",
  openGraph: {
    title: "NEXORA — Anna Dubrovenko",
    description: "One evolving intelligence core. Many systems that turn intelligence into new human possibilities.",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "NEXORA — Anna Dubrovenko",
    description: "One evolving intelligence core. Many systems that turn intelligence into new human possibilities."
  }
};

type Branch = {
  id:string; name:string; tagline_ru:string; tagline_en:string;
  summary_ru:string; summary_en:string; public_url:string|null;
  status:"live"|"building"|"coming"; sort_order:number; icon:string;
};
type Update = {
  id:string; branch_id:string; title_ru:string; title_en:string;
  summary_ru:string; summary_en:string; capability_ru:string|null;
  capability_en:string|null; public_url:string|null; published_at:string;
};

const fallback:Branch[] = [
  {id:"anham",name:"ANHAM",tagline_ru:"Тело, здоровье, восстановление",tagline_en:"Body, health and recovery",summary_ru:"Ветка NEXORA для тела, здоровья и восстановления.",summary_en:"The NEXORA branch for body, health and recovery.",public_url:"https://pythonmethodcenter.com",status:"building",sort_order:10,icon:"◉"},
  {id:"way",name:"WAY",tagline_ru:"Жизнь, психика, решения, потенциал",tagline_en:"Life, mind, decisions and potential",summary_ru:"Ветка для жизни человека целиком: состояние, решения, цели, проекты и возможности.",summary_en:"A branch for the whole life context: state, decisions, goals, projects and possibilities.",public_url:null,status:"building",sort_order:20,icon:"∞"},
  {id:"woman-club",name:"WOMAN CLUB",tagline_ru:"Сообщество, развитие, связь",tagline_en:"Community, growth and connection",summary_ru:"Пространство сообщества, встреч и совместного развития.",summary_en:"A space for community, meetings and shared growth.",public_url:null,status:"building",sort_order:30,icon:"♡"},
  {id:"api",name:"NEXORA API",tagline_ru:"Интеллект NEXORA для других систем",tagline_en:"NEXORA intelligence for other systems",summary_ru:"Будущий программный доступ к capabilities, skills, orchestration и новым ветвям.",summary_en:"Future programmatic access to capabilities, skills, orchestration and new branches.",public_url:null,status:"coming",sort_order:40,icon:"⌘"},
  {id:"python-method-center",name:"PYTHON METHOD CENTER",tagline_ru:"Центр восстановления и долголетия",tagline_en:"Rehabilitation and longevity center",summary_ru:"Рабочая цифровая система центра и его AI-инфраструктуры.",summary_en:"The operating digital system of the center and its AI infrastructure.",public_url:"https://pythonmethodcenter.com",status:"live",sort_order:50,icon:"◆"}
];

async function isOwner(){
  const auth=await createSupabaseServerClient();
  if(!auth) return false;
  const {data:{user}}=await auth.auth.getUser();
  return Boolean(user?.email_confirmed_at && user.email?.toLowerCase()===PRIMARY_FOUNDER_EMAIL.toLowerCase());
}

async function publicData(){
  const db=createSupabaseServiceClient();
  if(!db) return {branches:fallback,updates:[] as Update[]};
  const [b,u]=await Promise.all([
    db.from("nexora_public_branches").select("id,name,tagline_ru,tagline_en,summary_ru,summary_en,public_url,status,sort_order,icon").order("sort_order"),
    db.from("nexora_public_updates").select("id,branch_id,title_ru,title_en,summary_ru,summary_en,capability_ru,capability_en,public_url,published_at").order("published_at",{ascending:false}).limit(12)
  ]);
  return {branches:(b.error||!b.data?.length?fallback:b.data) as Branch[],updates:(u.error?[]:u.data||[]) as Update[]};
}

const statusLabel=(status:Branch["status"])=>status==="live"?"Работает":status==="building"?"Развивается":"Готовится";

export default async function NexoraPage(){
  if(await isOwner()) redirect("/nexora-hub/index.html");
  const {branches,updates}=await publicData();

  return <main className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.photo} aria-hidden="true" />
      <div className={styles.overlay} />
      <div className={styles.heroCopy}>
        <p className={styles.kicker}>ANNA DUBROVENKO · HUMAN POTENTIAL × AI</p>
        <h1>NEXORA</h1>
        <p className={styles.lead}>Один развивающийся нейромозг. Много систем, которые превращают интеллект в новые возможности для человека.</p>
        <div className={styles.core}><span>✦</span><b>NEXORA CORE</b><small>учится · соединяет · усиливает · создаёт</small></div>
      </div>
    </section>

    <section className={styles.branches} aria-labelledby="branches-title">
      <div className={styles.sectionHead}>
        <div><p>ЭКОСИСТЕМА</p><h2 id="branches-title">Ветки NEXORA</h2></div>
        <span>Каждая ветвь решает свою задачу, но растёт от одного ядра.</span>
      </div>
      <div className={styles.branchGrid}>
        {branches.map((branch,index)=>{
          const branchUpdates=updates.filter(u=>u.branch_id===branch.id).slice(0,2);
          return <details className={styles.branch} key={branch.id} open={index===0}>
            <summary>
              <span className={styles.icon}>{branch.icon}</span>
              <span><b>{branch.name}</b><small>{branch.tagline_ru}</small></span>
              <i>{statusLabel(branch.status)}</i>
            </summary>
            <div className={styles.branchBody}>
              <p>{branch.summary_ru}</p>
              {branchUpdates.length>0 && <div className={styles.miniUpdates}>
                {branchUpdates.map(item=><article key={item.id}><b>{item.title_ru}</b><span>{item.summary_ru}</span></article>)}
              </div>}
              {branch.public_url
                ? <a href={branch.public_url} target="_blank" rel="noreferrer">Открыть систему ↗</a>
                : <span className={styles.building}>Публичное пространство ветви готовится</span>}
            </div>
          </details>
        })}
      </div>
    </section>

    <section className={styles.value} aria-labelledby="value-title">
      <div className={styles.sectionHead}>
        <div><p>ЖИВАЯ СИСТЕМА</p><h2 id="value-title">Что стало возможным нового</h2></div>
        <span>Эта лента меняется вместе с NEXORA — без ручного переписывания сайта.</span>
      </div>
      <div className={styles.updateGrid}>
        {updates.length ? updates.map(item=><article className={styles.update} key={item.id}>
          <small>{branches.find(b=>b.id===item.branch_id)?.name||"NEXORA"}</small>
          <h3>{item.title_ru}</h3>
          <p>{item.summary_ru}</p>
          {item.capability_ru && <blockquote>{item.capability_ru}</blockquote>}
          {item.public_url && <a href={item.public_url} target="_blank" rel="noreferrer">Посмотреть ↗</a>}
        </article>) : <article className={styles.update}><small>NEXORA</small><h3>Система растёт из реального опыта</h3><p>Новые проверенные возможности будут появляться здесь автоматически по мере развития ядра и его ветвей.</p></article>}
      </div>
    </section>

    <section className={styles.explain}>
      <p className={styles.kicker}>КАК ЭТО УСТРОЕНО</p>
      <h2>Чем сильнее становится ядро, тем больше могут его ветви.</h2>
      <div className={styles.flow}><span>NEXORA</span><i>→</i><span>ветви</span><i>→</i><span>опыт людей</span><i>→</i><span>обучение</span><i>→</i><span>новые возможности</span></div>
      <p>Внутренняя работа Анны, личная память и рабочие гипотезы закрыты. Наружу система выпускает только специально разрешённые и проверенные результаты, ресурсы и возможности.</p>
    </section>

    <footer className={styles.footer}><b>NEXORA</b><span>by Anna Dubrovenko</span><a href="/login?next=%2Fnexora">Owner access</a></footer>
  </main>
}

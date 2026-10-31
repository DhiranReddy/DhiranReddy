import fs from "node:fs/promises";

const login = process.env.GITHUB_USER || "DhiranReddy";
const token = process.env.METRICS_TOKEN;
if (!token) throw new Error("METRICS_TOKEN is required");
const data = JSON.parse(await fs.readFile(new URL("../profile-data.json", import.meta.url)));
const esc = (v = "") => String(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const api = async (url) => {
  const r = await fetch(url, {headers: {Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}});
  if (!r.ok) throw new Error(`${url}: ${r.status} ${await r.text()}`);
  return r.json();
};
const gql = async (query, variables) => {
  const r = await fetch("https://api.github.com/graphql", {method: "POST", headers: {Authorization: `Bearer ${token}`, "Content-Type": "application/json"}, body: JSON.stringify({query, variables})});
  const out = await r.json();
  if (!r.ok || out.errors) throw new Error(JSON.stringify(out.errors || out));
  return out.data;
};

const query = `query($login:String!){user(login:$login){name login avatarUrl createdAt followers{totalCount} repositories(first:100,ownerAffiliations:OWNER,isFork:false,privacy:PUBLIC){totalCount nodes{name stargazerCount forkCount primaryLanguage{name color} languages(first:10){edges{size node{name color}}}}} contributionsCollection{totalCommitContributions restrictedContributionsCount contributionCalendar{totalContributions weeks{contributionDays{date contributionCount color}}}}}}`;
const {user} = await gql(query, {login});
const avatarResponse = await fetch(user.avatarUrl);
const avatar = `data:${avatarResponse.headers.get("content-type") || "image/jpeg"};base64,${Buffer.from(await avatarResponse.arrayBuffer()).toString("base64")}`;
const repos = user.repositories.nodes;
const stars = repos.reduce((n, r) => n + r.stargazerCount, 0);
const forks = repos.reduce((n, r) => n + r.forkCount, 0);
const languageBytes = new Map();
for (const repo of repos) for (const {size, node} of repo.languages.edges) languageBytes.set(node.name, {size: (languageBytes.get(node.name)?.size || 0) + size, color: node.color || "#8b949e"});
const languages = [...languageBytes].map(([name, v]) => ({name, ...v})).sort((a,b) => b.size-a.size).slice(0,6);
const totalLanguageBytes = languages.reduce((n,l) => n+l.size,0) || 1;
for (const l of languages) l.percent = Math.round(l.size / totalLanguageBytes * 100);
const weeks = user.contributionsCollection.contributionCalendar.weeks.slice(-26);
const days = weeks.flatMap(w => w.contributionDays);
const totalContrib = user.contributionsCollection.contributionCalendar.totalContributions;
const commitTotal = user.contributionsCollection.totalCommitContributions + user.contributionsCollection.restrictedContributionsCount;
const accountYears = Math.max(1, Math.floor((Date.now() - new Date(user.createdAt)) / 31557600000));
const projectDetails = await Promise.all(data.projects.map(async p => ({...(await api(`https://api.github.com/repos/${login}/${p.repo}`)), ...p})));

const text = (x,y,value,cls="t fg b",anchor="start") => `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(value)}</text>`;
const iconChip = (x,y,label,i) => `<g transform="translate(${x} ${y})"><rect width="${Math.max(42,label.length*8+16)}" height="24" rx="5" class="chip"/><text x="${Math.max(42,label.length*8+16)/2}" y="17" class="t s bold ${["green","blue","cyan","yellow"][i%4]}" text-anchor="middle">${esc(label)}</text></g>`;
const colors = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];
const maxDay = Math.max(1,...days.map(d=>d.contributionCount));
const calendar = days.map((d,i) => {const col=Math.floor(i/7), row=i%7, level=d.contributionCount?Math.max(1,Math.ceil(d.contributionCount/maxDay*4)):0; return `<rect x="${col*13}" y="${row*13}" width="10" height="10" rx="2" fill="${colors[level]}"><title>${d.date}: ${d.contributionCount} contributions</title></rect>`}).join("");
let barX=0; const languageBar=languages.map(l=>{const w=440*l.percent/100; const s=`<rect x="${barX}" width="${w}" height="8" fill="${l.color}"/>`;barX+=w;return s}).join("");
const languageLegend=languages.map((l,i)=>text(805+(i%3)*145,491+Math.floor(i/3)*20,`● ${l.name} ${l.percent}%`,`t muted s`)).join("");
const techChips=data.technologies.map((v,i)=>iconChip(336+(i%4)*108,548+Math.floor(i/4)*32,v,i)).join("");
const activityBars = days.slice(-24).map((d,i)=>`<rect x="${i*17}" y="${64-Math.max(3,d.contributionCount/maxDay*60)}" width="10" height="${Math.max(3,d.contributionCount/maxDay*60)}" rx="2" fill="#238636"><title>${d.date}: ${d.contributionCount}</title></rect>`).join("");

const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="640" viewBox="0 0 1280 640" role="img">
<title>${esc(data.name)} — live GitHub engineering dashboard</title><defs><clipPath id="avatar"><circle cx="170" cy="183" r="91"/></clipPath><style>.bg{fill:#0d1117}.top{fill:#161b22}.fg{fill:#c9d1d9}.muted{fill:#8b949e}.blue{fill:#58a6ff}.green{fill:#3fb950}.yellow{fill:#e3b341}.cyan{fill:#39c5cf}.rule{stroke:#30363d}.t{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.m{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.s{font-size:12px}.b{font-size:14px}.h{font-size:16px}.hero{font-size:22px;font-weight:650}.bold{font-weight:650}.chip{fill:#161b22;stroke:#30363d}</style></defs>
<rect width="1280" height="640" class="bg"/><rect width="1280" height="58" class="top"/>${text(76,38,"◉","t fg hero")}
<circle cx="170" cy="183" r="93" fill="#0d1117" stroke="#30363d"/><image href="${avatar}" x="79" y="92" width="182" height="182" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatar)"/>
${text(78,320,"GitHub metrics","t fg hero")}${text(78,344,`${login} / profile`,"t muted h")}${text(78,384,`⌁ ${data.website.replace("https://","")}`)}${text(78,412,`⚙ ${data.role}`)}${text(78,440,`⌖ ${data.location}`)}${text(78,468,`↗ ${data.linkedin}`)}${text(78,496,"◈ Claude Certified Architect")}
${text(332,92,`♟ ${data.name}`,"t blue h bold")}${text(332,118,`◷ Joined GitHub ${accountYears} years ago`,"t muted b")}${text(332,142,`⌂ ${data.company}`,"t muted b")}${text(332,166,`▣ ${user.repositories.totalCount} public repositories`,"t blue b")}${text(332,190,`♧ ${user.followers.totalCount} followers · ${stars} stars · ${forks} forks`,"t muted b")}${text(332,214,`⌁ ${totalContrib} contributions in the last year`,"t muted b")}
${text(555,92,data.highlights[0],"t muted b")}${text(555,118,data.highlights[1],"t muted b")}${text(555,142,data.highlights[2],"t muted b")}${text(555,166,data.highlights[3],"t muted b")}${text(555,190,`${commitTotal} public commits this year`,"t muted b")}
${text(332,258,"♧ Coding habits and recent activity","t blue h")}${text(450,286,"Contribution activity · latest 24 days","t blue s")}<g transform="translate(340 300)"><line y1="64" x2="410" y2="64" class="rule"/>${activityBars}</g>
${text(332,402,"Commit activity by day","t blue s")}${text(565,402,"Language activity","t blue s")}<g transform="translate(344 418)">${days.slice(-7).map((d,i)=>`<rect x="${i*28}" y="${58-Math.max(3,d.contributionCount/maxDay*55)}" width="16" height="${Math.max(3,d.contributionCount/maxDay*55)}" rx="2" fill="#238636"/>`).join("")}</g>${languages.slice(0,3).map((l,i)=>`${text(565,428+i*25,l.name,"t muted s")}<rect x="645" y="${420+i*25}" width="${l.percent*1.2}" height="8" rx="4" fill="${l.color}"/>${text(772,428+i*25,`${l.percent}%`,"t muted s","end")}`).join("")}
${text(332,532,"⚒ Mastered technologies and topics","t blue h")}${techChips}
${text(790,92,"▣ Contributions calendar","t blue h")}<g transform="translate(790 112)">${calendar}</g>${text(1145,136,`Current year`,"t muted b")}${text(1145,160,`${totalContrib} contributions`,"t muted b")}${text(1145,184,`${commitTotal} commits`,"t muted b")}
${text(790,240,"▷ Selected systems","t blue h")}${projectDetails.map((p,i)=>`<rect x="792" y="${258+i*62}" width="44" height="44" rx="6" fill="#161b22" stroke="#30363d"/>${text(814,286+i*62,p.name[0],`t ${i?"blue":"green"} bold`,"middle")}${text(850,273+i*62,p.name,"t fg b")}${text(850,294+i*62,p.description,"t muted s")}${text(1170,273+i*62,`★ ${p.stargazers_count}  ⑂ ${p.forks_count}`,"t muted s")}`).join("")}
${text(790,405,"Most used languages","t blue h")}<g transform="translate(790 420)">${languageBar}</g>${languageLegend}
${text(790,546,`▣ ${projectDetails.length} public engineering case studies`,"t blue h")}${text(790,574,`◷ Generated ${new Date().toISOString().slice(0,10)} from live GitHub data`,"t muted b")}<rect x="790" y="596" width="440" height="7" rx="4" fill="#21262d"/><rect x="790" y="596" width="${Math.min(440,totalContrib/2)}" height="7" rx="4" fill="#238636"/>
</svg>`;
await fs.writeFile(new URL("../github-metrics.svg", import.meta.url), svg);
console.log(`Generated github-metrics.svg for ${login}: ${totalContrib} contributions, ${languages.length} languages`);

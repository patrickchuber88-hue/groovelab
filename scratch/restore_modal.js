const fs = require("fs");
const path = require("path");

const brainDir = "/Users/patrickhuber/.gemini/antigravity/brain";
const conversations = fs.readdirSync(brainDir);

const reconstructedLines = [];

for (const c of conversations) {
  const file = path.join(brainDir, c, ".system_generated/logs/transcript.jsonl");
  if (!fs.existsSync(file)) continue;
  
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n");
  for (const line of lines) {
    if (!line) continue;
    if (line.includes("StudentDetailModal.tsx")) {
      const step = JSON.parse(line);
      if (step.content) {
        const contentLines = step.content.split("\n");
        for (const cl of contentLines) {
          const match = cl.match(/^(\d+):\s(.*)$/);
          if (match) {
            const lineNum = parseInt(match[1]);
            const content = match[2];
            reconstructedLines[lineNum] = content;
          }
        }
      }
    }
  }
}

// 1. Fill in block [251,274]
const block1 = `                    count = skills.filter(s => {
                      const sInst = s.instrument?.toLowerCase();
                      const target = inst.toLowerCase();
                      let match = false;
                      if (target === 'guitar') match = sInst === 'guitar' || sInst === 'e-gitarre';
                      else if (target === 'bass') match = sInst === 'bass' || sInst === 'e-bass';`.split("\n");
for (let i = 0; i < block1.length; i++) {
  reconstructedLines[251 + i] = block1[i];
}

// 2. Fill in block [995,1014]
const block2 = `                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {s.instruments.map((inst: any, idx: number) => (
                        <div 
                          key={idx} 
                          title={\`\${inst.name}\${inst.part_number > 1 || (s.instruments.filter((i:any) => i.name === inst.name).length > 1) ? \` \${inst.part_number}\` : ''}\`}
                          style={{ 
                            fontSize: '0.8rem', 
                            fontWeight: 800, 
                            padding: '4px 8px', 
                            borderRadius: '8px', 
                            background: 'white', 
                            border: '1px solid #e2e8f0', 
                            color: inst.progress === 100 ? '#10b981' : (inst.progress > 0 ? '#ff9500' : '#94a3b8'),
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',`.split("\n");
for (let i = 0; i < block2.length; i++) {
  reconstructedLines[995 + i] = block2[i];
}

// 3. Fill in block [1079,1079]
reconstructedLines[1079] = `                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.01)'`;

// 4. Fill in block [1198,1239]
const block4 = `                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#1d1d1f' }}>GrooveLab-Modul aktivieren</span>
                        <span style={{ fontSize: '0.72rem', color: '#86868b' }}>Songbooks, Bands & üben</span>
                      </div>
                      <button 
                        onClick={() => handleToggleGroovelab(!isGroovelabActive)}
                        style={{
                          width: '46px',
                          height: '26px',
                          borderRadius: '99px',
                          background: isGroovelabActive ? '#007aff' : '#e5e5ea',
                          border: 'none',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'background 0.25s ease',
                          padding: 0
                        }}
                      >
                        <div style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          position: 'absolute',
                          top: '2px',
                          left: isGroovelabActive ? '22px' : '2px',
                          transition: 'left 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }} />
                      </button>
                    </div>`.split("\n");
for (let i = 0; i < block4.length; i++) {
  reconstructedLines[1198 + i] = block4[i];
}

// 5. Fill in block [1308,1334]
const block5 = `                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
                        <img src={b.photo_url || '/avatar_ghost.jpg'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1d1d1f' }}>{b.name}</div>
                    </div>
                  ))}
                  {bands.length === 0 && !loading && (
                    <div style={{ fontSize: '0.85rem', color: '#86868b', background: '#ffffff', padding: '20px', borderRadius: '20px', border: '1px solid rgba(0, 0, 0, 0.04)', textAlign: 'center' }}>
                      In keiner Band aktiv.
                    </div>
                  )}
                </div>
              </section>

              {/* Wochenplan-Zeiten */}
              <section>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1d1d1f', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.02em' }}>
                  <Calendar size={16} style={{ color: '#ff9500' }} /> Wochenplan-Zeiten
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(0, 0, 0, 0.04)', borderRadius: '24px', overflow: 'hidden', padding: '1px' }}>
                  {weekSessions.map((pres, idx) => (
                    <div key={idx} style={{ 
                      background: '#ffffff', 
                      padding: '16px 20px',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      color: '#1d1d1f',
                      display: 'flex',`.split("\n");
for (let i = 0; i < block5.length; i++) {
  reconstructedLines[1308 + i] = block5[i];
}

// Filter out any undefined or empty lines, and write them sequentially
const finalCodeLines = [];
let maxLine = 0;
for (const k of Object.keys(reconstructedLines)) {
  const num = parseInt(k);
  if (num > maxLine) maxLine = num;
}

for (let i = 1; i <= maxLine; i++) {
  if (reconstructedLines[i] !== undefined) {
    finalCodeLines.push(reconstructedLines[i]);
  }
}

fs.writeFileSync("apps/groovelab/src/components/StudentDetailModal.tsx", finalCodeLines.join("\n"), "utf8");
console.log("Successfully restored StudentDetailModal.tsx cleanly!");

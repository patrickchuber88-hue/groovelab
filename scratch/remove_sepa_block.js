const fs = require('fs');
const file = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/SecretaryDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetComment = `{/* SEPA Transaktionshistorie */}`;
const startIdx = content.indexOf(targetComment);

if (startIdx !== -1) {
  const searchPart = content.slice(startIdx);
  // Find the exact outer div closing sequence. It closes:
  // 1. item div map (ended by map closing '))} </div>')
  // 2. list container div ('</div>')
  // 3. inner border panel div ('</div>')
  // 4. outer SEPA div ('</div>')
  // Let's count '</div>' occurrences or find the exact ending structure.
  
  // The block ends with:
  //                             </div>
  //                           </div>
  //                         </div>
  const matchSeq = `                            </div>\n                            </div>\n                          </div>`;
  const matchSeqCRLF = `                            </div>\r\n                            </div>\r\n                          </div>`;
  
  let endIdx = searchPart.indexOf(matchSeq);
  let seqLen = matchSeq.length;
  
  if (endIdx === -1) {
    endIdx = searchPart.indexOf(matchSeqCRLF);
    seqLen = matchSeqCRLF.length;
  }
  
  if (endIdx !== -1) {
    const blockToRemove = searchPart.slice(0, endIdx + seqLen);
    content = content.replace(blockToRemove, '');
    console.log('SEPA block successfully sliced and removed!');
  } else {
    console.log('Match sequence for end of outer div not found!');
  }
} else {
  console.log('Start comment of SEPA block not found!');
}

fs.writeFileSync(file, content, 'utf8');

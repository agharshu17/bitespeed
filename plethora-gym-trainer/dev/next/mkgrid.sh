#!/bin/bash
# Assemble a dev-only build of the parts and render a contact sheet.
set -e
D=/home/user/bitespeed/plethora-gym-trainer/dev/next
cd $D
cat p1.js > _dev.js
cat p2*.js >> _dev.js
cat >> _dev.js <<'EOF'
  idle: { nm:'Idle', vw:'front', al:null, pr:null,
    tk: tr('0|to1 na6 nb9 fa-6 fb-9 nt2 ns-1 ft-2 fs1',
           '0.5|y0.012 to2.5 ne-1 na8 nb12 fa-8 fb-12 nt3 ns-2 ft-3 fs2',
           '1|to1 na6 nb9 fa-6 fb-9 nt2 ns-1 ft-2 fs1'),
    st: tr('0|to1 na6 nb9 fa-6 fb-9') },
  cheer: { nm:'Cheer', vw:'front', al:null, pr:null,
    tk: tr('0|y0.05 to0 nt16 ns-18 ft-16 fs18 na128 nb150 fa-128 fb-150',
           '0.45|y-0.14 to0 ne-6 nt14 ns24 ft-14 fs-24 na146 nb160 fa-146 fb-160',
           '1|y0.05 to0 nt16 ns-18 ft-16 fs18 na128 nb150 fa-128 fb-150'),
    st: tr('0|y0.05 to0 na128 nb150 fa-128 fb-150') }
  };
EOF
cat p3_head.js p3_mid.js p3_tail.js >> _dev.js
cat >> _dev.js <<'EOF'
  window.__GT = { EX: EX, solve: solve, sampleTrack: sampleTrack, C: C,
    drawFigureInPanel: drawFigureInPanel, drawBackground: drawBackground, panelFrame: panelFrame };
})();
EOF
node --check _dev.js && echo "SYNTAX OK  $(wc -c < _dev.js) bytes"

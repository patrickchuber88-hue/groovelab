import React from 'react';

export const normalizeInstrument = (name: string): string => {
  if (!name) return "";
  const n = (name || "").toLowerCase().trim();
  if (n.includes('guitar') || n.includes('gitarre')) return 'E-Gitarre';
  if (n.includes('bass')) return 'E-Bass';
  if (n.includes('drum') || n.includes('schlagzeug')) return 'E-Drums';
  if (n.includes('vocals') || n.includes('gesang') || n.includes('stimme')) return 'Vocals';
  if (n.includes('piano') || n.includes('keys') || n.includes('klavier') || n.includes('e-piano')) return 'E-Piano';
  return name;
};

export const renderInstrumentIcon = (name: string, color?: string, size = 18): React.ReactNode => {
  const norm = (name || '').toLowerCase().trim();
  const isBass = norm.includes('bass');
  const isGuitar = norm.includes('guitar') || norm.includes('gitarre');

  if (isGuitar || isBass) {
    // Original Twemoji crimson red for Gitarre, or branding yellow for Bass
    const guitarColor = color || (isBass ? '#eab308' : '#BB1A34');

    return React.createElement(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: '0 0 36 36',
        width: size,
        height: size,
        style: { display: 'inline-block', verticalAlign: 'middle' }
      },
      // 1. Guitar Body (colored red or yellow)
      React.createElement('path', {
        fill: guitarColor,
        d: 'M21.828 20.559C19.707 21.266 19 17.731 19 17.731s.965-.968.235-1.829c1.138-1.137.473-1.707.473-1.707-1.954-1.953-5.119-1.953-7.071 0-.246.246-.414.467-.553.678-.061.086-.115.174-.17.262l-.014.027c-.285.475-.491.982-.605 1.509-.156.319-.379.659-.779 1.06-1.414 1.414-4.949-.707-7.778 2.121-.029.029-.045.069-.069.104-.094.084-.193.158-.284.25-3.319 3.319-3.003 9.018.708 12.728 3.524 3.525 8.84 3.979 12.209 1.17.058-.031.117-.061.165-.109.071-.072.126-.14.193-.21.053-.049.109-.093.161-.143 1.693-1.694 2.342-3.73 2.086-5.811-.068-.99-.165-1.766.39-2.321.707-.707 2.828 0 4.242-1.414 2.117-2.122.631-3.983-.711-3.537z'
      }),
      // 2. Fretboard / Neck
      React.createElement('path', {
        fill: '#292F33',
        d: 'M14.987 18.91L30.326 3.572l2.121 2.122-15.339 15.339z'
      }),
      // 3. Pickguard
      React.createElement('path', {
        fill: '#F5F8FA',
        d: 'M10.001 29.134c1.782 1.277 1.959 3.473 1.859 4.751-.042.528.519.898.979.637 2.563-1.456 4.602-3.789 4.038-7.853-.111-.735.111-2.117 2.272-2.406 2.161-.29 2.941-1.099 3.208-1.485.153-.221.29-.832-.312-.854-.601-.022-2.094.446-3.431-1.136-1.337-1.582-1.559-2.228-1.604-2.473-.045-.245-1.409-3.694-2.525-1.864-.927 1.521-1.958 4.509-5.287 5.287-1.355.316-3.069 1.005-3.564 1.96-.832 1.604.46 2.725 1.574 3.483 1.115.757 2.793 1.953 2.793 1.953z'
      }),
      // 4. Pickups / Knobs details
      React.createElement('path', {
        fill: '#292F33',
        d: 'M13.072 19.412l1.414-1.415 3.536 3.535-1.414 1.414zm-4.475 4.474l1.415-1.414 3.535 3.535-1.414 1.414z'
      }),
      // 5. Strings
      React.createElement('path', {
        fill: '#CCD6DD',
        d: 'M7.396 27.189L29.198 5.427l.53.531L7.927 27.72zm.869.868L30.067 6.296l.53.531L8.796 28.59z'
      }),
      // 6. Knob details
      React.createElement('path', {
        fill: '#292F33',
        d: 'M9.815 28.325c.389.389.389 1.025 0 1.414s-1.025.389-1.414 0l-2.122-2.121c-.389-.389-.389-1.025 0-1.414h.001c.389-.389 1.025-.389 1.414 0l2.121 2.121z'
      }),
      React.createElement('circle', {
        fill: '#292F33',
        cx: '13.028',
        cy: '29.556',
        r: '1'
      }),
      React.createElement('path', {
        fill: '#292F33',
        d: 'M14.445 31.881c0 .379-.307.686-.686.686-.379 0-.686-.307-.686-.686 0-.379.307-.686.686-.686.379 0 .686.307.686.686z'
      }),
      // 7. Headstock (colored red or yellow)
      React.createElement('path', {
        fill: guitarColor,
        d: 'M35.088 4.54c.415.415.415 1.095-.001 1.51l-4.362 3.02c-.416.415-1.095.415-1.51 0L26.95 6.804c-.415-.415-.415-1.095.001-1.51l3.02-4.361c.416-.415 1.095-.415 1.51 0l3.607 3.607z'
      }),
      // 8. Tuning Pegs
      React.createElement('circle', { fill: '#66757F', cx: '32.123', cy: '9.402', r: '.625' }),
      React.createElement('circle', { fill: '#66757F', cx: '33.381', cy: '8.557', r: '.625' }),
      React.createElement('circle', { fill: '#66757F', cx: '34.64', cy: '7.712', r: '.625' }),
      React.createElement('circle', { fill: '#66757F', cx: '26.712', cy: '3.811', r: '.625' }),
      React.createElement('circle', { fill: '#66757F', cx: '27.555', cy: '2.571', r: '.625' }),
      React.createElement('circle', { fill: '#66757F', cx: '28.398', cy: '1.332', r: '.625' })
    );
  }

  if (norm.includes('drum') || norm.includes('schlagzeug')) {
    return React.createElement(
      'svg',
      { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 36 36', width: size, height: size, style: { display: 'inline-block', verticalAlign: 'middle' } },
      React.createElement('path', { fill: '#F18F26', d: 'M0 18h36v9H0z' }),
      React.createElement('ellipse', { fill: '#F18F26', cx: '18', cy: '26', rx: '18', ry: '9' }),
      React.createElement('ellipse', { fill: '#F18F26', cx: '18', cy: '27', rx: '18', ry: '9' }),
      React.createElement('path', { fill: '#9D0522', d: 'M0 10v16h.117c.996 4.499 8.619 8 17.883 8s16.887-3.501 17.883-8H36V10H0z' }),
      React.createElement('ellipse', { fill: '#F18F26', cx: '18', cy: '11', rx: '18', ry: '9' }),
      React.createElement('ellipse', { fill: '#F18F26', cx: '18', cy: '12', rx: '18', ry: '9' }),
      React.createElement('path', { fill: '#F18F26', d: 'M0 10h1v2H0zm35 0h1v2h-1z' }),
      React.createElement('ellipse', { fill: '#FCAB40', cx: '18', cy: '10', rx: '18', ry: '9' }),
      React.createElement('ellipse', { fill: '#F5F8FA', cx: '18', cy: '10', rx: '17', ry: '8' }),
      React.createElement('path', { fill: '#FDD888', d: 'M18 3c9.03 0 16.395 3.316 16.946 7.5.022-.166.054-.331.054-.5 0-4.418-7.611-8-17-8S1 5.582 1 10c0 .169.032.334.054.5C1.605 6.316 8.97 3 18 3z' }),
      React.createElement('path', { d: 'M28.601 2.599c.44-.33.53-.96.2-1.4l-.6-.8c-.33-.44-.96-.53-1.4-.2L14.157 10.243c-.774-.167-1.785.083-2.673.749-1.326.994-1.863 2.516-1.2 3.4s2.275.794 3.6-.2c.835-.626 1.355-1.461 1.462-2.215l13.255-9.378zm5.868 2.919l-.509-.861c-.28-.474-.896-.632-1.37-.352l-13.913 8.751c-.719-.141-1.626.023-2.472.524-1.426.843-2.127 2.297-1.565 3.248.562.951 2.174 1.039 3.6.196 1.005-.594 1.638-1.49 1.735-2.301l14.142-7.835c.474-.281.632-.897.352-1.37z', fill: '#AA695B' }),
      React.createElement('path', { fill: '#DA2F47', d: 'M2 28c-.55 0-1-.45-1-1v-9c0-.55.45-1 1-1s1 .45 1 1v9c0 .55-.45 1-1 1zm9 4c-.55 0-1-.45-1-1v-9c0-.55.45-1 1-1s1 .45 1 1v9c0 .55-.45 1-1 1zm12 0c-.55 0-1-.45-1-1v-9c0-.55.45-1 1-1s1 .45 1 1v9c0 .55-.45 1-1 1zm11-4c-.55 0-1-.45-1-1v-9c0-.55.45-1 1-1s1 .45 1 1v9c0 .55-.45 1-1 1z' })
    );
  }

  if (norm.includes('piano') || norm.includes('keys') || norm.includes('klavier') || norm.includes('e-piano')) {
    return React.createElement(
      'svg',
      { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 36 36', width: size, height: size, style: { display: 'inline-block', verticalAlign: 'middle' } },
      React.createElement('path', { fill: '#31373D', d: 'M2 36s-2 0-2-2V2s0-2 2-2h32.031C36 0 36 2 36 2v32s0 2-2 2H2z' }),
      React.createElement('path', { d: 'M19 33s0 1 1 1h5c1 0 1-1 1-1V5h-7v28zm9-28v28s0 1 1 1h4c1 0 1-1 1-1V5h-6zM10 33s0 1 1 1h5c1 0 1-1 1-1V5h-7v28zm-8 0s0 1 1 1h4c1 0 1-1 1-1V5H2v28z', fill: '#E1E8ED' }),
      React.createElement('path', { fill: '#31373D', d: 'M30 23s0 1-1 1h-4c-1 0-1-1-1-1V3h6v20zm-9 0s0 1-1 1h-4c-1 0-1-1-1-1V3h6v20zm-9 0s0 1-1 1H7c-1 0-1-1-1-1V3h6v20z' })
    );
  }

  if (norm.includes('vocal') || norm.includes('gesang') || norm.includes('stimme')) {
    return React.createElement(
      'svg',
      { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 36 36', width: size, height: size, style: { display: 'inline-block', verticalAlign: 'middle' } },
      React.createElement('path', { fill: '#8899A6', d: 'M35.999 11.917c0 3.803-3.082 6.885-6.885 6.885-3.802 0-6.884-3.082-6.884-6.885 0-3.802 3.082-6.884 6.884-6.884 3.803 0 6.885 3.082 6.885 6.884z' }),
      React.createElement('path', { fill: '#31373D', d: 'M32.81 18.568c-.336.336-.881.336-1.217 0L22.466 9.44c-.336-.336-.336-.881 0-1.217l1.217-1.217c.336-.336.881-.336 1.217 0l9.127 9.128c.336.336.336.881 0 1.217l-1.217 1.217zm-6.071.136l-4.325-4.327c-.778-.779-1.995-.733-2.719.101l-9.158 10.574c-1.219 1.408-1.461 3.354-.711 4.73l-4.911 4.912 1.409 1.409 4.877-4.877c1.381.84 3.411.609 4.862-.648l10.575-9.157c.834-.723.881-1.94.101-2.717z' }),
      React.createElement('path', { fill: '#55ACEE', d: 'M4 6v8.122C3.686 14.047 3.352 14 3 14c-1.657 0-3 .896-3 2s1.343 2 3 2 3-.896 3-2V9.889l5 2.222v5.011c-.314-.075-.648-.122-1-.122-1.657 0-3 .896-3 2s1.343 2 3 2 2.999-.896 3-2v-9L4 6zm14-5v8.123C17.685 9.048 17.353 9 17 9c-1.657 0-3 .895-3 2 0 1.104 1.343 2 3 2 1.656 0 3-.896 3-2V1h-2z' })
    );
  }

  return '🎵';
};

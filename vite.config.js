// Vite 설정 파일입니다. (GitHub Pages 배포를 위해 base 경로를 지정합니다)
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  base: '/notsold/', // GitHub Pages 배포 시, 저장소명으로 base 경로를 지정해야 정상 라우팅됩니다.
  plugins: [vue()],
  server: {
    port: 3000,
    open: true,
  },
});

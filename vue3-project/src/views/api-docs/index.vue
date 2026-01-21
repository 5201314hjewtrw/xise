<template>
  <div class="public-api-docs-wrapper">
    <div class="public-header">
      <div class="header-content">
        <a href="/" class="back-home">
          <SvgIcon name="home" :width="20" :height="20" />
          <span>返回主站</span>
        </a>
      </div>
    </div>
    <div class="public-content-body" ref="contentBodyRef">
      <ApiDocsContent :standalone="true" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import SvgIcon from '@/components/SvgIcon.vue'
import ApiDocsContent from './ApiDocsContent.vue'

const contentBodyRef = ref(null)
</script>

<style scoped>
.public-api-docs-wrapper {
  min-height: 100vh;
  background-color: var(--bg-color-primary);
}

.public-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background-color: var(--bg-color-secondary);
  border-bottom: 1px solid var(--border-color-primary);
  z-index: 100;
  display: flex;
  align-items: center;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.back-home {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-color-primary);
  text-decoration: none;
  font-size: 14px;
  padding: 8px 16px;
  border-radius: 8px;
  background-color: var(--bg-color-primary);
  transition: all 0.2s ease;
}

.back-home:hover {
  background-color: var(--primary-color);
  color: white;
}

.public-content-body {
  margin-top: 60px;
  padding: 20px;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  min-height: calc(100vh - 60px);
}

@media (max-width: 768px) {
  .public-content-body {
    padding: 10px;
  }
  
  .header-content {
    padding: 0 10px;
  }
}
</style>

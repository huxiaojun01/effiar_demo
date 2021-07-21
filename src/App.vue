<template>
  <div id="app">
    <div class="main">
      <router-view/>
    </div>

  </div>
</template>

<script>

  export default {
    name: 'App',
    components:{
    }
  }
</script>

<style lang="less">
  #app{
    height: 100%;
  }
  .main {
    position: absolute;
    width: 100%;
    height: 100%;
  }

</style>

# Collection of vue hooks

```shell
# publish
pnpm publish -r --force --access=public
```

### **esm-browser** 格式使用

```html
<div id="app"></div>

<script type="importmap">
  {
    "imports": {
      "vue": "https://unpkg.com/vue@3/dist/vue.esm-browser.prod.js",
      "lhook": "./js/lhook.esm-browser.prod.js"
    },
    "scopes": {}
  }
</script>
<script type="module">
  // import { createApp } from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
  import { createApp, ref } from "vue";
  import { useBoolean } from "lhook";

  const App = {
    template: `<h1>{{msg}} {{value ? "world" : "lhook"}}</h1>`,
    setup() {
      const [value, { toggle }] = useBoolean();
      const msg = ref("Hello");
      return { msg, value, toggle };
    }
  };

  createApp(App).mount(document.getElementById("app"));
</script>
```

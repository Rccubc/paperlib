<script setup lang="ts">
import path from "path";
import { Ref, inject } from "vue";

const props = defineProps({
  sups: Object as () => Array<string>,
});

const editingURL = inject<Ref<string>>("editingURL");

const emits = defineEmits(["event:submit-name-editing"]);

// TODO sup: generate ui show name
const getSupShowName = (supURL: string) => {
  if (supURL.startsWith("http")) {
    return "HTTP";
  }
  const extPart = path.extname(supURL);
  let namePart: string;

  if (extPart !== "") {
    namePart = supURL.slice(
      supURL.lastIndexOf("sup"),
      supURL.lastIndexOf(extPart)
    );
    return /^sup\d+$/.test(namePart)
      ? extPart.replace(".", "").toUpperCase()
      : `${namePart.replace(/^sup\d+_/, "")}${extPart.toLowerCase()}`;
  } else {
    namePart = supURL.slice(supURL.lastIndexOf("sup"));
    return /^sup\d+$/.test(namePart) ? "SUP" : namePart.replace(/^sup\d+_/, "");
  }
};

const onClick = async (url: string) => {
  fileService.open(await fileService.access(url, true));
};

const onRightClicked = (event: MouseEvent, url: string) => {
  logService.info(
    "onRightClicked(): On 'event:rightclick' call contextMenuService::showSupMenu()",
    `url=${url}`,
    false,
    "supplementary.vue"
  );
  PLMainAPI.contextMenuService.showSupMenu(url);
};

// TODO sup: 发出 event:submit-name-editing
const onEditSubmit = (e: Event) => {
  e.preventDefault();
  e.stopPropagation();
  const customName = (e.target as HTMLInputElement).value;
  logService.info(
    "onEditSubmit(): emit event:submit-name-editing",
    `customName=${customName}, editingURL=${editingURL?.value}`,
    false,
    "supplementary.vue"
  );
  emits("event:submit-name-editing", customName);
};

// just for debug
const onInputFocus = (e: Event) => {
  logService.info(
    "onInputFocus(): the sup <div> change to <input />",
    "",
    false,
    "supplementary.vue"
  );
};
</script>

<template>
  <div class="flex flex-wrap mt-1 text-xs space-x-1">
    <div
      class="flex space-x-1 rounded-md p-1 select-none cursor-pointer bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 hover:shadow-sm hover:dark:bg-neutral-600"
      v-for="sup in sups"
    >
      <div
        v-if="sup !== editingURL"
        class="text-xxs my-auto"
        @click="onClick(sup)"
        @contextmenu="(e: MouseEvent) => onRightClicked(e, sup)"
      >
        {{ getSupShowName(sup) }}
      </div>
      <input
        v-else
        class="my-auto text-xxs rounded-md border-2 grow truncate whitespace-nowrap bg-transparent border-accentlight dark:border-accentdark"
        type="text"
        autofocus
        :value="getSupShowName(editingURL)"
        @focus="onInputFocus"
        @keydown.enter="onEditSubmit"
        @click.stop
      />
    </div>
  </div>
</template>

"use strict";
(self["webpackChunkMontageFrames"] = self["webpackChunkMontageFrames"] || []).push([["368"], {
2731(__unused_rspack___webpack_module__, __webpack_exports__, __webpack_require__) {
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
  "default": () => (/* reexport safe */ _index_a5mre0mn_mjs__rspack_import_0.B)
});
/* import */ var _index_a5mre0mn_mjs__rspack_import_0 = __webpack_require__(2990);
/* import */ var _index_tq8vxqde_mjs__rspack_import_1 = __webpack_require__(6348);
/* import */ var _index_x76vz7p6_mjs__rspack_import_2 = __webpack_require__(2779);
/* import */ var _index_xcasmzgx_mjs__rspack_import_3 = __webpack_require__(4232);
/* import */ var _index_y3n5kfm7_mjs__rspack_import_4 = __webpack_require__(4103);
/* import */ var _index_rcv7qkt5_mjs__rspack_import_5 = __webpack_require__(2126);










},
2990(__unused_rspack___webpack_module__, __webpack_exports__, __webpack_require__) {
__webpack_require__.d(__webpack_exports__, {
  B: () => (Models)
});
/* import */ var _index_tq8vxqde_mjs__rspack_import_0 = __webpack_require__(6348);
Object(function __rspack_missing_module() { var e = new Error("Cannot find module '@remotion/whisper-webgpu'"); e.code = 'MODULE_NOT_FOUND'; throw e; }());
/* import */ var react__rspack_import_2 = __webpack_require__(6540);
/* import */ var react_jsx_runtime__rspack_import_3 = __webpack_require__(4848);


// src/components/Transcription/Models.tsx



var AVAILABLE_MODELS = Object(function __rspack_missing_module() { var e = new Error("Cannot find module '@remotion/whisper-webgpu'"); e.code = 'MODULE_NOT_FOUND'; throw e; }())();
var Models = ({ description, indent, visible }) => {
  const isModelCached = (0,react__rspack_import_2.useCallback)((model) => Object(function __rspack_missing_module() { var e = new Error("Cannot find module '@remotion/whisper-webgpu'"); e.code = 'MODULE_NOT_FOUND'; throw e; }())({ model }), []);
  const loadModel = (0,react__rspack_import_2.useCallback)((model, onProgress) => Object(function __rspack_missing_module() { var e = new Error("Cannot find module '@remotion/whisper-webgpu'"); e.code = 'MODULE_NOT_FOUND'; throw e; }())({
    model,
    onProgress: (progress) => onProgress(progress.progress)
  }), []);
  const removeModel = (0,react__rspack_import_2.useCallback)((model) => Object(function __rspack_missing_module() { var e = new Error("Cannot find module '@remotion/whisper-webgpu'"); e.code = 'MODULE_NOT_FOUND'; throw e; }())({ model }), []);
  return /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_3.jsx)(_index_tq8vxqde_mjs__rspack_import_0/* .ModelManager */.P, {
    ariaLabel: "Whisper models",
    availableModels: AVAILABLE_MODELS,
    description,
    indent,
    isModelCached,
    loadModel,
    prepare: Object(function __rspack_missing_module() { var e = new Error("Cannot find module '@remotion/whisper-webgpu'"); e.code = 'MODULE_NOT_FOUND'; throw e; }()),
    removeModel,
    visible
  });
};




},
6348(__unused_rspack___webpack_module__, __webpack_exports__, __webpack_require__) {
__webpack_require__.d(__webpack_exports__, {
  P: () => (ModelManager)
});
/* import */ var _index_x76vz7p6_mjs__rspack_import_0 = __webpack_require__(2779);
/* import */ var _index_y3n5kfm7_mjs__rspack_import_1 = __webpack_require__(4103);
/* import */ var _remotion_studio_shared__rspack_import_2 = __webpack_require__(3872);
/* import */ var react__rspack_import_3 = __webpack_require__(6540);
/* import */ var react_jsx_runtime__rspack_import_4 = __webpack_require__(4848);



// src/components/ModelManager.tsx



var modelPanel = {
  ..._index_x76vz7p6_mjs__rspack_import_0/* .optionsPanel */.Z6,
  flexDirection: "column"
};
var hiddenPanel = { display: "none" };
var container = {
  boxSizing: "border-box",
  flex: 1,
  fontFamily: "sans-serif",
  minWidth: 0,
  padding: "16px 16px 0",
  width: "100%"
};
var flushContainer = {
  ...container,
  padding: "16px 0 0"
};
var descriptionStyle = {
  color: _index_y3n5kfm7_mjs__rspack_import_1/* .LIGHT_TEXT */.hf,
  fontSize: 13,
  lineHeight: 1.5,
  margin: 0,
  whiteSpace: "pre-line"
};
var list = { marginTop: 14 };
var modelRow = {
  alignItems: "center",
  display: "flex",
  gap: 10,
  minHeight: 38
};
var modelIcon = {
  flexShrink: 0,
  height: 16,
  width: 16
};
var statusIcon = {
  flexShrink: 0,
  height: 14,
  width: 14
};
var modelName = {
  color: _index_y3n5kfm7_mjs__rspack_import_1/* .LIGHT_TEXT */.hf,
  flex: 1,
  fontFamily: "monospace",
  fontSize: 13,
  lineHeight: 1.4,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};
var status = {
  color: _index_y3n5kfm7_mjs__rspack_import_1/* .LIGHT_TEXT */.hf,
  fontSize: 12,
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1.4,
  whiteSpace: "nowrap"
};
var actionIcon = { height: 14, width: 14 };
var actionSlot = {
  alignItems: "center",
  display: "inline-flex",
  flexShrink: 0,
  height: 24,
  justifyContent: "center",
  width: 24
};
var ModelManager = ({
  ariaLabel,
  availableModels,
  description,
  indent,
  isModelCached,
  loadModel,
  prepare,
  removeModel,
  visible
}) => {
  const mounted = (0,react__rspack_import_3.useRef)(true);
  const initialized = (0,react__rspack_import_3.useRef)(false);
  const [cachedModels, setCachedModels] = (0,react__rspack_import_3.useState)(null);
  const [actionState, setActionState] = (0,react__rspack_import_3.useState)({
    type: "idle"
  });
  const [cacheCheckError, setCacheCheckError] = (0,react__rspack_import_3.useState)(null);
  (0,react__rspack_import_3.useEffect)(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  (0,react__rspack_import_3.useEffect)(() => {
    if (!visible || initialized.current) {
      return;
    }
    initialized.current = true;
    Promise.resolve().then(() => prepare?.()).then(() => Promise.all(availableModels.map(async ({ name }) => await isModelCached(name) ? name : null))).then((models) => {
      if (mounted.current) {
        const cached = new Set;
        for (const model of models) {
          if (model !== null) {
            cached.add(model);
          }
        }
        setCachedModels(cached);
      }
    }).catch((error) => {
      if (mounted.current) {
        setCachedModels(new Set);
        setCacheCheckError(error instanceof Error ? error.message : String(error));
      }
    });
  }, [availableModels, isModelCached, prepare, visible]);
  const downloadModel = (0,react__rspack_import_3.useCallback)((model) => {
    setActionState({ type: "downloading", model, progress: 0 });
    loadModel(model, (progress) => {
      if (mounted.current) {
        setActionState({ type: "downloading", model, progress });
      }
    }).then(() => {
      if (mounted.current) {
        setCachedModels((current) => new Set([...current ?? [], model]));
        setActionState({ type: "idle" });
      }
    }).catch((error) => {
      if (mounted.current) {
        setActionState({
          type: "error",
          model,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }, [loadModel]);
  const remove = (0,react__rspack_import_3.useCallback)((model) => {
    setActionState({ type: "removing", model });
    removeModel(model).then(() => {
      if (mounted.current) {
        setCachedModels((current) => {
          const next = new Set(current ?? []);
          next.delete(model);
          return next;
        });
        setActionState({ type: "idle" });
      }
    }).catch((error) => {
      if (mounted.current) {
        setActionState({
          type: "error",
          model,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }, [removeModel]);
  const renderDownloadIcon = (0,react__rspack_import_3.useCallback)((color) => {
    return /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_4.jsx)(_index_x76vz7p6_mjs__rspack_import_0/* .CloudDownloadIcon */.$w, {
      color,
      style: actionIcon
    });
  }, []);
  const renderRemoveIcon = (0,react__rspack_import_3.useCallback)((color) => {
    return /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_4.jsx)(_index_x76vz7p6_mjs__rspack_import_0/* .TrashIcon */.uc, {
      color,
      style: actionIcon
    });
  }, []);
  const actionInProgress = actionState.type === "downloading" || actionState.type === "removing";
  return /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_4.jsx)("div", {
    style: visible ? modelPanel : hiddenPanel,
    className: _index_x76vz7p6_mjs__rspack_import_0/* .VERTICAL_SCROLLBAR_CLASSNAME */.uV,
    children: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_4.jsxs)("div", {
      style: indent ? container : flushContainer,
      children: [
        description === null ? null : /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_4.jsx)("p", {
          style: descriptionStyle,
          children: description
        }),
        cacheCheckError ? /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_4.jsx)(_index_x76vz7p6_mjs__rspack_import_0/* .ValidationMessage */.Xl, {
          align: "flex-start",
          message: cacheCheckError,
          type: "error"
        }) : null,
        /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_4.jsx)("div", {
          style: description === null ? undefined : list,
          role: "list",
          "aria-label": ariaLabel,
          children: availableModels.map((model) => {
            const cached = cachedModels?.has(model.name) ?? false;
            const processingThisModel = actionState.type !== "idle" && actionState.type !== "error" && actionState.model === model.name;
            const progress = actionState.type === "downloading" && actionState.model === model.name ? actionState.progress : null;
            const modelStatus = processingThisModel ? actionState.type === "removing" ? "Removing…" : `Downloading${progress === null ? "…" : ` ${Math.round(progress * 100)}%`}` : actionState.type === "error" && actionState.model === model.name ? actionState.message : (0,_remotion_studio_shared__rspack_import_2/* .formatBytes */.z3)(model.webGpuDownloadSize);
            return /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_4.jsxs)("div", {
              role: "listitem",
              style: modelRow,
              children: [
                /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_4.jsx)(_index_x76vz7p6_mjs__rspack_import_0/* .ModelsIcon */.oi, {
                  "aria-hidden": true,
                  color: _index_y3n5kfm7_mjs__rspack_import_1/* .LIGHT_TEXT */.hf,
                  style: modelIcon
                }),
                /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_4.jsx)("span", {
                  style: modelName,
                  children: model.name
                }),
                /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_4.jsx)("span", {
                  role: "group",
                  style: status,
                  "aria-label": modelStatus,
                  children: modelStatus
                }),
                cached ? /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_4.jsx)(_index_x76vz7p6_mjs__rspack_import_0/* .CheckCircleFilled */.Pk, {
                  "aria-hidden": true,
                  style: { ...statusIcon, fill: _index_y3n5kfm7_mjs__rspack_import_1/* .BLUE */.ft }
                }) : null,
                processingThisModel ? /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_4.jsx)("span", {
                  style: actionSlot,
                  children: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_4.jsx)(_index_x76vz7p6_mjs__rspack_import_0/* .Spinner */.y$, {
                    duration: 0.5,
                    size: 14
                  })
                }) : cached ? /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_4.jsx)(_index_x76vz7p6_mjs__rspack_import_0/* .ActionTooltip */.mT, {
                  label: "Uninstall",
                  shortcut: null,
                  delay: 800,
                  dismissOnClick: true,
                  children: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_4.jsx)(_index_x76vz7p6_mjs__rspack_import_0/* .InlineAction */.gs, {
                    "aria-label": `Remove ${model.name}`,
                    disabled: actionInProgress,
                    onClick: () => remove(model.name),
                    renderAction: renderRemoveIcon,
                    variant: null
                  })
                }) : /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_4.jsx)(_index_x76vz7p6_mjs__rspack_import_0/* .ActionTooltip */.mT, {
                  label: "Install",
                  shortcut: null,
                  delay: 800,
                  dismissOnClick: true,
                  children: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_4.jsx)(_index_x76vz7p6_mjs__rspack_import_0/* .InlineAction */.gs, {
                    "aria-label": `Download ${model.name}`,
                    disabled: cachedModels === null || actionInProgress,
                    onClick: () => downloadModel(model.name),
                    renderAction: renderDownloadIcon,
                    variant: null
                  })
                })
              ]
            }, model.name);
          })
        })
      ]
    })
  });
};




},

}]);
//# sourceMappingURL=368.bundle.js.map
"use strict";
(self["webpackChunkMontageFrames"] = self["webpackChunkMontageFrames"] || []).push([["2"], {
4169(__unused_rspack___webpack_module__, __webpack_exports__, __webpack_require__) {
__webpack_require__.d(__webpack_exports__, {
  TranscriptionModal: () => (TranscriptionModal)
});
/* import */ var _index_7tt71e8n_mjs__rspack_import_0 = __webpack_require__(6429);
/* import */ var _index_8ypzypga_mjs__rspack_import_1 = __webpack_require__(3319);
/* import */ var _index_4v0n76tw_mjs__rspack_import_2 = __webpack_require__(3989);
/* import */ var _index_eajrm3ss_mjs__rspack_import_3 = __webpack_require__(8487);
/* import */ var _index_hqxc6tzp_mjs__rspack_import_4 = __webpack_require__(1781);
/* import */ var _index_ersyztct_mjs__rspack_import_5 = __webpack_require__(7117);
/* import */ var _index_dfy1t576_mjs__rspack_import_6 = __webpack_require__(189);
/* import */ var _index_nm7e02ze_mjs__rspack_import_7 = __webpack_require__(649);
/* import */ var _index_a5mre0mn_mjs__rspack_import_8 = __webpack_require__(2990);
/* import */ var _index_tq8vxqde_mjs__rspack_import_9 = __webpack_require__(6348);
/* import */ var _index_x76vz7p6_mjs__rspack_import_10 = __webpack_require__(2779);
/* import */ var _index_xcasmzgx_mjs__rspack_import_11 = __webpack_require__(4232);
/* import */ var _index_y3n5kfm7_mjs__rspack_import_12 = __webpack_require__(4103);
/* import */ var _index_rcv7qkt5_mjs__rspack_import_13 = __webpack_require__(2126);
/* import */ var _remotion_studio_shared__rspack_import_14 = __webpack_require__(3872);
Object(function __rspack_missing_module() { var e = new Error("Cannot find module '@remotion/whisper-webgpu'"); e.code = 'MODULE_NOT_FOUND'; throw e; }());
/* import */ var react__rspack_import_16 = __webpack_require__(6540);
/* import */ var react_jsx_runtime__rspack_import_17 = __webpack_require__(4848);
















// src/components/Transcription/TranscriptionModal.tsx




// src/components/Transcription/whisper-languages.ts
var WHISPER_LANGUAGES = [
  ["af", "Afrikaans"],
  ["sq", "Albanian"],
  ["am", "Amharic"],
  ["ar", "Arabic"],
  ["hy", "Armenian"],
  ["as", "Assamese"],
  ["az", "Azerbaijani"],
  ["ba", "Bashkir"],
  ["eu", "Basque"],
  ["be", "Belarusian"],
  ["bn", "Bengali"],
  ["bs", "Bosnian"],
  ["br", "Breton"],
  ["bg", "Bulgarian"],
  ["my", "Burmese"],
  ["ca", "Catalan"],
  ["zh", "Chinese"],
  ["hr", "Croatian"],
  ["cs", "Czech"],
  ["da", "Danish"],
  ["nl", "Dutch"],
  ["en", "English"],
  ["et", "Estonian"],
  ["fo", "Faroese"],
  ["fi", "Finnish"],
  ["fr", "French"],
  ["gl", "Galician"],
  ["ka", "Georgian"],
  ["de", "German"],
  ["el", "Greek"],
  ["gu", "Gujarati"],
  ["ht", "Haitian Creole"],
  ["ha", "Hausa"],
  ["haw", "Hawaiian"],
  ["he", "Hebrew"],
  ["hi", "Hindi"],
  ["hu", "Hungarian"],
  ["is", "Icelandic"],
  ["id", "Indonesian"],
  ["it", "Italian"],
  ["ja", "Japanese"],
  ["jw", "Javanese"],
  ["kn", "Kannada"],
  ["kk", "Kazakh"],
  ["km", "Khmer"],
  ["ko", "Korean"],
  ["lo", "Lao"],
  ["la", "Latin"],
  ["lv", "Latvian"],
  ["ln", "Lingala"],
  ["lt", "Lithuanian"],
  ["lb", "Luxembourgish"],
  ["mk", "Macedonian"],
  ["mg", "Malagasy"],
  ["ms", "Malay"],
  ["ml", "Malayalam"],
  ["mt", "Maltese"],
  ["mi", "Maori"],
  ["mr", "Marathi"],
  ["mn", "Mongolian"],
  ["ne", "Nepali"],
  ["no", "Norwegian"],
  ["nn", "Nynorsk"],
  ["oc", "Occitan"],
  ["ps", "Pashto"],
  ["fa", "Persian"],
  ["pl", "Polish"],
  ["pt", "Portuguese"],
  ["pa", "Punjabi"],
  ["ro", "Romanian"],
  ["ru", "Russian"],
  ["sa", "Sanskrit"],
  ["sr", "Serbian"],
  ["sn", "Shona"],
  ["sd", "Sindhi"],
  ["si", "Sinhala"],
  ["sk", "Slovak"],
  ["sl", "Slovenian"],
  ["so", "Somali"],
  ["es", "Spanish"],
  ["su", "Sundanese"],
  ["sw", "Swahili"],
  ["sv", "Swedish"],
  ["tl", "Tagalog"],
  ["tg", "Tajik"],
  ["ta", "Tamil"],
  ["tt", "Tatar"],
  ["te", "Telugu"],
  ["th", "Thai"],
  ["bo", "Tibetan"],
  ["tr", "Turkish"],
  ["tk", "Turkmen"],
  ["uk", "Ukrainian"],
  ["ur", "Urdu"],
  ["uz", "Uzbek"],
  ["vi", "Vietnamese"],
  ["cy", "Welsh"],
  ["yi", "Yiddish"],
  ["yo", "Yoruba"]
];

// src/components/Transcription/TranscriptionModal.tsx

var TRANSCRIPTION_OUTPUT_MESSAGE_ID = "remotion-transcription-output-message";
var TRANSCRIPTION_CHUNK_MESSAGE_ID = "remotion-transcription-chunk-message";
var TRANSCRIPTION_DECODING_MESSAGE_ID = "remotion-transcription-decoding-message";
var TRANSCRIPTION_TASK_MESSAGE_ID = "remotion-transcription-task-message";
var DEFAULT_CHUNK_LENGTH_IN_SECONDS = 30;
var DEFAULT_STRIDE_LENGTH_IN_SECONDS = 5;
var DEFAULT_TEMPERATURE = 1;
var DEFAULT_TOP_K = 50;
var DEFAULT_REPETITION_PENALTY = 1;
var DEFAULT_NO_REPEAT_NGRAM_SIZE = 0;
var MAX_CHUNK_LENGTH_IN_SECONDS = 30;
var AVAILABLE_MODELS = Object(function __rspack_missing_module() { var e = new Error("Cannot find module '@remotion/whisper-webgpu'"); e.code = 'MODULE_NOT_FOUND'; throw e; }())();
var settingsPanel = {
  ..._index_x76vz7p6_mjs__rspack_import_10/* .optionsPanel */.Z6,
  flexDirection: "column",
  paddingTop: 16
};
var advancedPanel = {
  ...settingsPanel,
  paddingTop: 0
};
var transcriptionModalStyle = {
  ..._index_x76vz7p6_mjs__rspack_import_10/* .outerModalStyle */.uT,
  outline: "none"
};
var transcriptionLayout = {
  ..._index_x76vz7p6_mjs__rspack_import_10/* .horizontalLayout */.D6,
  flex: "1 1 auto"
};
var controlStyle = {
  width: 330,
  maxWidth: "100%"
};
var nestedLabelStyle = {
  color: "inherit",
  fontFamily: "inherit",
  fontSize: "inherit",
  lineHeight: "inherit"
};
var taskMessageRow = {
  display: "flex",
  justifyContent: "flex-end",
  padding: "0 16px 8px"
};
var outputRow = {
  display: "flex",
  flexDirection: "row",
  alignItems: "flex-start",
  paddingLeft: 16,
  paddingRight: 16,
  paddingTop: 4,
  paddingBottom: 12
};
var outputRightRow = {
  display: "flex",
  flex: 1,
  flexDirection: "row",
  alignItems: "flex-start",
  justifyContent: "flex-end",
  minWidth: 0
};
var tooltipContent = {
  color: _index_y3n5kfm7_mjs__rspack_import_12/* .LIGHT_TEXT */.hf,
  fontSize: 13,
  lineHeight: 1.5,
  maxWidth: 360,
  padding: 12
};
var tooltipInlineCode = {
  color: _index_y3n5kfm7_mjs__rspack_import_12/* .WHITE */.UE,
  fontFamily: "monospace",
  fontSize: "inherit",
  lineHeight: "inherit"
};
var hiddenPanel = {
  display: "none"
};
var existsMessageStyle = {
  display: "inline-flex",
  alignItems: "center",
  minWidth: 0,
  fontFamily: "sans-serif",
  fontSize: 13,
  lineHeight: "18px",
  color: _index_y3n5kfm7_mjs__rspack_import_12/* .WHITE */.UE,
  whiteSpace: "nowrap"
};
var openIconStyle = {
  width: 12,
  height: 12,
  flexShrink: 0
};
var TranscriptionSettingLabel = ({ children, inputId, name }) => {
  return /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsxs)("div", {
    style: _index_4v0n76tw_mjs__rspack_import_2/* .label */.Pfx,
    children: [
      inputId === null ? name : /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("label", {
        htmlFor: inputId,
        style: nestedLabelStyle,
        children: name
      }),
      /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_x76vz7p6_mjs__rspack_import_10/* .Spacing */.Kz, {
        x: 0.5
      }),
      /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_4v0n76tw_mjs__rspack_import_2/* .InfoBubble */.Di9, {
        "aria-label": `Learn more about ${name}`,
        children: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
          style: tooltipContent,
          children
        })
      })
    ]
  });
};
var ModelSettings = ({
  cachedModels,
  selectedLanguage,
  selectedModel,
  selectedTask,
  setSelectedLanguage,
  setSelectedModel,
  setSelectedTask,
  supportState
}) => {
  const selectedModelInfo = AVAILABLE_MODELS.find(({ name }) => name === selectedModel);
  if (!selectedModelInfo) {
    throw new Error(`Unknown Whisper model: ${selectedModel}`);
  }
  const modelOptions = (0,react__rspack_import_16.useMemo)(() => {
    return AVAILABLE_MODELS.map((model) => {
      return {
        type: "item",
        id: model.name,
        value: model.name,
        label: `${model.name} · ${(0,_remotion_studio_shared__rspack_import_14/* .formatBytes */.z3)(model.webGpuDownloadSize)}${cachedModels.has(model.name) ? " · Downloaded" : ""}`,
        leftItem: model.name === selectedModel ? /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_4v0n76tw_mjs__rspack_import_2/* .Checkmark */.MGO, {}) : null,
        keyHint: null,
        quickSwitcherLabel: null,
        subMenu: null,
        disabled: false,
        onClick: () => setSelectedModel(model.name)
      };
    });
  }, [cachedModels, selectedModel, setSelectedModel]);
  const languageOptions = (0,react__rspack_import_16.useMemo)(() => {
    return WHISPER_LANGUAGES.map(([languageCode, languageName]) => ({
      type: "item",
      id: languageCode,
      value: languageCode,
      label: languageName,
      leftItem: languageCode === selectedLanguage ? /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_4v0n76tw_mjs__rspack_import_2/* .Checkmark */.MGO, {}) : null,
      keyHint: null,
      quickSwitcherLabel: null,
      subMenu: null,
      disabled: false,
      onClick: () => setSelectedLanguage(languageCode)
    }));
  }, [selectedLanguage, setSelectedLanguage]);
  const effectiveTask = selectedModelInfo.supportsTranslation ? selectedTask : "transcribe";
  const taskOptions = (0,react__rspack_import_16.useMemo)(() => {
    return [
      {
        type: "item",
        id: "transcribe",
        value: "transcribe",
        label: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsxs)(react_jsx_runtime__rspack_import_17.Fragment, {
          children: [
            /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("span", {
              "aria-hidden": "true",
              style: nestedLabelStyle,
              children: "Transcribe"
            }),
            /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("span", {
              style: { position: "absolute", clip: "rect(0 0 0 0)" },
              children: "Task: Transcribe"
            })
          ]
        }),
        leftItem: effectiveTask === "transcribe" ? /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_4v0n76tw_mjs__rspack_import_2/* .Checkmark */.MGO, {}) : null,
        keyHint: null,
        quickSwitcherLabel: null,
        subMenu: null,
        disabled: false,
        onClick: () => setSelectedTask("transcribe")
      },
      {
        type: "item",
        id: "translate",
        value: "translate",
        label: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsxs)(react_jsx_runtime__rspack_import_17.Fragment, {
          children: [
            /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("span", {
              "aria-hidden": "true",
              style: nestedLabelStyle,
              children: "Translate to English"
            }),
            /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("span", {
              style: { position: "absolute", clip: "rect(0 0 0 0)" },
              children: "Task: Translate to English"
            })
          ]
        }),
        leftItem: effectiveTask === "translate" ? /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_4v0n76tw_mjs__rspack_import_2/* .Checkmark */.MGO, {}) : null,
        keyHint: null,
        quickSwitcherLabel: null,
        subMenu: null,
        disabled: false,
        onClick: () => setSelectedTask("translate")
      }
    ];
  }, [effectiveTask, setSelectedTask]);
  (0,react__rspack_import_16.useEffect)(() => {
    if (!selectedModelInfo.supportsTranslation) {
      setSelectedTask("transcribe");
    }
  }, [selectedModelInfo.supportsTranslation, setSelectedTask]);
  return /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsxs)(react_jsx_runtime__rspack_import_17.Fragment, {
    children: [
      /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsxs)("div", {
        style: _index_4v0n76tw_mjs__rspack_import_2/* .optionRow */.wVt,
        children: [
          /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
            style: _index_4v0n76tw_mjs__rspack_import_2/* .label */.Pfx,
            children: "Whisper model"
          }),
          /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
            style: _index_4v0n76tw_mjs__rspack_import_2/* .rightRow */.jmp,
            children: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_4v0n76tw_mjs__rspack_import_2/* .Combobox */.G3_, {
              values: modelOptions,
              selectedId: selectedModel,
              "aria-label": "Whisper model",
              style: controlStyle
            })
          })
        ]
      }),
      selectedModelInfo.multilingual ? /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsxs)("div", {
        style: _index_4v0n76tw_mjs__rspack_import_2/* .optionRow */.wVt,
        children: [
          /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
            style: _index_4v0n76tw_mjs__rspack_import_2/* .label */.Pfx,
            children: "Spoken language"
          }),
          /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
            style: _index_4v0n76tw_mjs__rspack_import_2/* .rightRow */.jmp,
            children: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_4v0n76tw_mjs__rspack_import_2/* .Combobox */.G3_, {
              values: languageOptions,
              selectedId: selectedLanguage,
              "aria-label": "Spoken language",
              style: controlStyle
            })
          })
        ]
      }) : null,
      selectedModelInfo.supportsTranslation ? /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsxs)("div", {
        style: _index_4v0n76tw_mjs__rspack_import_2/* .optionRow */.wVt,
        children: [
          /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
            style: _index_4v0n76tw_mjs__rspack_import_2/* .label */.Pfx,
            children: "Task"
          }),
          /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
            style: _index_4v0n76tw_mjs__rspack_import_2/* .rightRow */.jmp,
            children: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_4v0n76tw_mjs__rspack_import_2/* .Combobox */.G3_, {
              values: taskOptions,
              selectedId: effectiveTask,
              "aria-label": "Task",
              style: controlStyle
            })
          })
        ]
      }) : null,
      effectiveTask === "translate" ? /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
        id: TRANSCRIPTION_TASK_MESSAGE_ID,
        "aria-live": "polite",
        style: taskMessageRow,
        children: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_x76vz7p6_mjs__rspack_import_10/* .ValidationMessage */.Xl, {
          align: "flex-end",
          message: "Word timings may be less accurate when translating to English.",
          type: "warning"
        })
      }) : null,
      supportState.type === "unsupported" ? /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
        style: { padding: "0 16px" },
        children: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_x76vz7p6_mjs__rspack_import_10/* .ValidationMessage */.Xl, {
          align: "flex-end",
          message: supportState.message,
          type: "error"
        })
      }) : null
    ]
  });
};
var OutputSettings = ({ exists, onOutNameChange, outName, validationMessage }) => {
  const openExistingOutput = (0,react__rspack_import_16.useCallback)(() => {
    if (!window.remotion_publicFolderExists) {
      (0,_index_eajrm3ss_mjs__rspack_import_3/* .showNotification */.Ds)("Could not find the public folder", 2000);
      return;
    }
    (0,_index_ersyztct_mjs__rspack_import_5/* .openInFileExplorer */.dP)({
      directory: `${window.remotion_publicFolderExists}/${outName}`
    }).catch((err) => {
      (0,_index_eajrm3ss_mjs__rspack_import_3/* .showNotification */.Ds)(`Could not open file: ${err.message}`, 2000);
    });
  }, [outName]);
  const renderOpenIcon = (0,react__rspack_import_16.useCallback)((color) => {
    return /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_4v0n76tw_mjs__rspack_import_2/* .ExpandedFolderIconSolid */.SeR, {
      style: openIconStyle,
      color
    });
  }, []);
  const fileManagerName = (0,_index_4v0n76tw_mjs__rspack_import_2/* .getFileManagerName */.L6$)(window.remotion_fileSystemPlatform);
  const isBrowserStudio = (0,_index_dfy1t576_mjs__rspack_import_6/* .getBrowserStudioOperations */.P3)() !== null;
  return /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsxs)("div", {
    style: outputRow,
    children: [
      /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsxs)(TranscriptionSettingLabel, {
        inputId: null,
        name: "Output in public/",
        children: [
          "Studio writes a JSON array compatible with",
          " ",
          /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("code", {
            style: tooltipInlineCode,
            children: "Caption[]"
          }),
          ". Load it from your composition with ",
          /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("code", {
            style: tooltipInlineCode,
            children: "staticFile()"
          }),
          "."
        ]
      }),
      /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
        style: outputRightRow,
        children: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsxs)("div", {
          style: controlStyle,
          children: [
            /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_4v0n76tw_mjs__rspack_import_2/* .RemotionInput */.WtJ, {
              "aria-label": "Caption output file",
              "aria-describedby": validationMessage || exists ? TRANSCRIPTION_OUTPUT_MESSAGE_ID : undefined,
              "aria-invalid": validationMessage ? true : undefined,
              status: validationMessage ? "error" : exists ? "warning" : "ok",
              style: _index_4v0n76tw_mjs__rspack_import_2/* .input */.hFB,
              type: "text",
              value: outName,
              onChange: onOutNameChange,
              rightAlign: true
            }),
            validationMessage || exists ? /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsxs)("div", {
              id: TRANSCRIPTION_OUTPUT_MESSAGE_ID,
              "aria-live": "polite",
              children: [
                /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_x76vz7p6_mjs__rspack_import_10/* .Spacing */.Kz, {
                  y: 1,
                  block: true
                }),
                /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_x76vz7p6_mjs__rspack_import_10/* .ValidationMessage */.Xl, {
                  align: "flex-end",
                  message: validationMessage ?? /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsxs)("span", {
                    style: existsMessageStyle,
                    children: [
                      isBrowserStudio ? null : /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_x76vz7p6_mjs__rspack_import_10/* .InlineAction */.gs, {
                        onClick: openExistingOutput,
                        renderAction: renderOpenIcon,
                        "aria-label": `Open in ${fileManagerName}`,
                        variant: null
                      }),
                      "Exists, will be overwritten"
                    ]
                  }),
                  type: validationMessage ? "error" : "warning"
                })
              ]
            }) : null
          ]
        })
      })
    ]
  });
};
var AdvancedSettings = ({
  chunkLengthInSeconds,
  doSample,
  forceFullSequences,
  noRepeatNgramSize,
  repetitionPenalty,
  setChunkLengthInSeconds,
  setDoSample,
  setForceFullSequences,
  setNoRepeatNgramSize,
  setRepetitionPenalty,
  setStrideLengthInSeconds,
  setTemperature,
  setTopK,
  strideLengthInSeconds,
  temperature,
  topK,
  decodingValidationMessage,
  validationMessage
}) => {
  const onForceFullSequencesChange = (0,react__rspack_import_16.useCallback)((event) => setForceFullSequences(event.target.checked), [setForceFullSequences]);
  const onDoSampleChange = (0,react__rspack_import_16.useCallback)((event) => setDoSample(event.target.checked), [setDoSample]);
  return /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsxs)(react_jsx_runtime__rspack_import_17.Fragment, {
    children: [
      /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsxs)("div", {
        "aria-describedby": validationMessage ? TRANSCRIPTION_CHUNK_MESSAGE_ID : undefined,
        "aria-invalid": validationMessage ? true : undefined,
        "aria-label": "Chunk settings",
        role: "group",
        children: [
          /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_8ypzypga_mjs__rspack_import_1/* .NumberSetting */.ey, {
            formatter: (value) => `${value}s`,
            hint: {
              content: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
                style: tooltipContent,
                children: "Studio splits long audio into chunks of up to 30 seconds. Longer chunks need fewer transcription passes."
              }),
              title: "Learn more about Chunk length"
            },
            max: MAX_CHUNK_LENGTH_IN_SECONDS,
            min: 1,
            name: "Chunk length",
            onValueChanged: setChunkLengthInSeconds,
            step: 1,
            value: chunkLengthInSeconds
          }),
          /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_8ypzypga_mjs__rspack_import_1/* .NumberSetting */.ey, {
            formatter: (value) => `${value}s`,
            hint: {
              content: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
                style: tooltipContent,
                children: "Overlaps both sides of each chunk to help preserve words at the boundaries."
              }),
              title: "Learn more about Stride length"
            },
            min: 0,
            name: "Stride length",
            onValueChanged: setStrideLengthInSeconds,
            step: 1,
            value: strideLengthInSeconds
          })
        ]
      }),
      validationMessage ? /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
        id: TRANSCRIPTION_CHUNK_MESSAGE_ID,
        "aria-live": "polite",
        style: { padding: "0 16px" },
        children: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_x76vz7p6_mjs__rspack_import_10/* .ValidationMessage */.Xl, {
          align: "flex-end",
          message: validationMessage,
          type: "error"
        })
      }) : null,
      /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsxs)("div", {
        "aria-describedby": decodingValidationMessage ? TRANSCRIPTION_DECODING_MESSAGE_ID : undefined,
        "aria-invalid": decodingValidationMessage ? true : undefined,
        "aria-label": "Decoding settings",
        role: "group",
        children: [
          /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_4v0n76tw_mjs__rspack_import_2/* .RenderModalHr */.YbN, {}),
          /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsxs)("div", {
            style: _index_4v0n76tw_mjs__rspack_import_2/* .optionRow */.wVt,
            children: [
              /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(TranscriptionSettingLabel, {
                inputId: "force-full-sequences",
                name: "Force full sequences",
                children: "Makes the job fail if Whisper leaves an incomplete timestamp sequence."
              }),
              /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
                style: _index_4v0n76tw_mjs__rspack_import_2/* .rightRow */.jmp,
                children: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_4v0n76tw_mjs__rspack_import_2/* .Checkbox */.Sc0, {
                  checked: forceFullSequences,
                  inputId: "force-full-sequences",
                  name: "force-full-sequences",
                  onChange: onForceFullSequencesChange
                })
              })
            ]
          }),
          /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_4v0n76tw_mjs__rspack_import_2/* .RenderModalHr */.YbN, {}),
          /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsxs)("div", {
            style: _index_4v0n76tw_mjs__rspack_import_2/* .optionRow */.wVt,
            children: [
              /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(TranscriptionSettingLabel, {
                inputId: "use-sampling",
                name: "Use sampling",
                children: "Makes decoding nondeterministic."
              }),
              /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
                style: _index_4v0n76tw_mjs__rspack_import_2/* .rightRow */.jmp,
                children: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_4v0n76tw_mjs__rspack_import_2/* .Checkbox */.Sc0, {
                  checked: doSample,
                  inputId: "use-sampling",
                  name: "use-sampling",
                  onChange: onDoSampleChange
                })
              })
            ]
          }),
          doSample ? /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsxs)(react_jsx_runtime__rspack_import_17.Fragment, {
            children: [
              /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_8ypzypga_mjs__rspack_import_1/* .NumberSetting */.ey, {
                hint: {
                  content: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
                    style: tooltipContent,
                    children: "Controls randomness when sampling."
                  }),
                  title: "Learn more about Temperature"
                },
                min: 0.1,
                name: "Temperature",
                onValueChanged: setTemperature,
                step: 0.1,
                value: temperature
              }),
              /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_8ypzypga_mjs__rspack_import_1/* .NumberSetting */.ey, {
                hint: {
                  content: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
                    style: tooltipContent,
                    children: "Limits the candidate tokens when sampling."
                  }),
                  title: "Learn more about Top K"
                },
                min: 0,
                name: "Top K",
                onValueChanged: setTopK,
                step: 1,
                value: topK
              })
            ]
          }) : null,
          /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_8ypzypga_mjs__rspack_import_1/* .NumberSetting */.ey, {
            hint: {
              content: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
                style: tooltipContent,
                children: "Discourages repeated tokens. A value of 1 disables the penalty."
              }),
              title: "Learn more about Repetition penalty"
            },
            min: 0.1,
            name: "Repetition penalty",
            onValueChanged: setRepetitionPenalty,
            step: 0.1,
            value: repetitionPenalty
          }),
          /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_8ypzypga_mjs__rspack_import_1/* .NumberSetting */.ey, {
            hint: {
              content: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
                style: tooltipContent,
                children: "Prevents repeated phrases of this many tokens. A value of 0 disables the filter."
              }),
              title: "Learn more about No-repeat n-gram size"
            },
            min: 0,
            name: "No-repeat n-gram size",
            onValueChanged: setNoRepeatNgramSize,
            step: 1,
            value: noRepeatNgramSize
          })
        ]
      }),
      decodingValidationMessage ? /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
        id: TRANSCRIPTION_DECODING_MESSAGE_ID,
        "aria-live": "polite",
        style: { padding: "0 16px" },
        children: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_x76vz7p6_mjs__rspack_import_10/* .ValidationMessage */.Xl, {
          align: "flex-end",
          message: decodingValidationMessage,
          type: "error"
        })
      }) : null
    ]
  });
};
var TranscriptionModal = ({
  audioStreamIndex,
  displayName,
  requestInit,
  src,
  target
}) => {
  const [tab, setTab] = (0,react__rspack_import_16.useState)("transcribe");
  const isModelCached = (0,react__rspack_import_16.useCallback)((model) => Object(function __rspack_missing_module() { var e = new Error("Cannot find module '@remotion/whisper-webgpu'"); e.code = 'MODULE_NOT_FOUND'; throw e; }())({ model }), []);
  const cachedModels = (0,_index_7tt71e8n_mjs__rspack_import_0/* .useModelCacheStatus */.X)({
    isModelCached,
    models: AVAILABLE_MODELS,
    refreshKey: tab
  });
  const [selectedModel, setSelectedModel] = (0,react__rspack_import_16.useState)("small.en");
  const [selectedLanguage, setSelectedLanguage] = (0,react__rspack_import_16.useState)("en");
  const [selectedTask, setSelectedTask] = (0,react__rspack_import_16.useState)("transcribe");
  const [chunkLengthInSeconds, setChunkLengthInSeconds] = (0,react__rspack_import_16.useState)(DEFAULT_CHUNK_LENGTH_IN_SECONDS);
  const [strideLengthInSeconds, setStrideLengthInSeconds] = (0,react__rspack_import_16.useState)(DEFAULT_STRIDE_LENGTH_IN_SECONDS);
  const [forceFullSequences, setForceFullSequences] = (0,react__rspack_import_16.useState)(false);
  const [doSample, setDoSample] = (0,react__rspack_import_16.useState)(false);
  const [temperature, setTemperature] = (0,react__rspack_import_16.useState)(DEFAULT_TEMPERATURE);
  const [topK, setTopK] = (0,react__rspack_import_16.useState)(DEFAULT_TOP_K);
  const [repetitionPenalty, setRepetitionPenalty] = (0,react__rspack_import_16.useState)(DEFAULT_REPETITION_PENALTY);
  const [noRepeatNgramSize, setNoRepeatNgramSize] = (0,react__rspack_import_16.useState)(DEFAULT_NO_REPEAT_NGRAM_SIZE);
  const [supportState, setSupportState] = (0,react__rspack_import_16.useState)({
    type: "checking"
  });
  const [outName, setOutName] = (0,react__rspack_import_16.useState)(() => (0,_index_8ypzypga_mjs__rspack_import_1/* .getDefaultCaptionOutputName */.wl)(src, displayName));
  const { addCaptionJob, captionJobs } = (0,react__rspack_import_16.useContext)(_index_hqxc6tzp_mjs__rspack_import_4/* .RenderQueueContext */.x7);
  const { setSelectedModal } = (0,react__rspack_import_16.useContext)(_index_4v0n76tw_mjs__rspack_import_2/* .SetSelectedModalContext */.Mqz);
  const { setSidebarCollapsedState } = (0,react__rspack_import_16.useContext)(_index_4v0n76tw_mjs__rspack_import_2/* .SidebarContext */.I0U);
  const staticFiles = (0,_index_4v0n76tw_mjs__rspack_import_2/* .useStaticFiles */.JM3)();
  (0,react__rspack_import_16.useEffect)(() => {
    let cancelled = false;
    Object(function __rspack_missing_module() { var e = new Error("Cannot find module '@remotion/whisper-webgpu'"); e.code = 'MODULE_NOT_FOUND'; throw e; }())().then((result) => {
      if (cancelled) {
        return;
      }
      setSupportState(result.supported ? { type: "supported" } : { type: "unsupported", message: result.detailedReason });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const normalizedOutName = outName.normalize("NFC").toLowerCase();
  const queuedOutputExists = captionJobs.some((job) => job.target === null && (job.status === "idle" || job.status === "running" || job.status === "saving") && job.outName.normalize("NFC").toLowerCase() === normalizedOutName);
  const outputValidationMessage = target === null ? (0,_index_8ypzypga_mjs__rspack_import_1/* .validateCaptionOutputName */.vh)(outName) ?? (queuedOutputExists ? "Another caption job is already using this output file" : null) : null;
  const exists = staticFiles.some((file) => file.name.normalize("NFC").toLowerCase() === normalizedOutName);
  const chunkValidationMessage = strideLengthInSeconds * 2 >= chunkLengthInSeconds ? "Stride length must be less than half of chunk length" : null;
  const decodingValidationMessage = !Number.isFinite(temperature) ? "Temperature must be a finite number greater than 0" : temperature <= 0 ? "Temperature must be greater than 0" : !Number.isInteger(topK) || topK < 0 ? "Top K must be a non-negative integer" : !Number.isFinite(repetitionPenalty) ? "Repetition penalty must be a finite number greater than 0" : repetitionPenalty <= 0 ? "Repetition penalty must be greater than 0" : !Number.isInteger(noRepeatNgramSize) || noRepeatNgramSize < 0 ? "No-repeat n-gram size must be a non-negative integer" : null;
  const canTranscribe = supportState.type === "supported" && outputValidationMessage === null && chunkValidationMessage === null && decodingValidationMessage === null;
  const transcribeDisabledReason = supportState.type === "checking" ? "Checking WebGPU support" : supportState.type === "unsupported" ? supportState.message : outputValidationMessage ?? chunkValidationMessage ?? decodingValidationMessage ?? undefined;
  const onOutNameChange = (0,react__rspack_import_16.useCallback)((event) => {
    setOutName(event.target.value);
  }, []);
  const onAddToQueue = (0,react__rspack_import_16.useCallback)(() => {
    if (!canTranscribe) {
      return;
    }
    const modelInfo = AVAILABLE_MODELS.find(({ name }) => name === selectedModel);
    if (!modelInfo) {
      throw new Error(`Unknown Whisper model: ${selectedModel}`);
    }
    addCaptionJob({
      src,
      displayName,
      audioStreamIndex,
      requestInit,
      outName: target === null ? outName : "Basic captions",
      target,
      model: selectedModel,
      language: modelInfo.multilingual ? selectedLanguage : null,
      task: modelInfo.supportsTranslation ? selectedTask : "transcribe",
      chunkLengthInSeconds,
      strideLengthInSeconds,
      forceFullSequences,
      doSample,
      temperature,
      topK,
      repetitionPenalty,
      noRepeatNgramSize
    });
    setSidebarCollapsedState({ left: null, right: "expanded" });
    (0,_index_4v0n76tw_mjs__rspack_import_2/* .persistSelectedOptionsSidebarPanel */.Gd8)("renders");
    _index_4v0n76tw_mjs__rspack_import_2/* .optionsSidebarTabs.current */.nm0.current?.selectRendersPanel();
    setSelectedModal(null);
  }, [
    addCaptionJob,
    audioStreamIndex,
    canTranscribe,
    chunkLengthInSeconds,
    displayName,
    doSample,
    forceFullSequences,
    noRepeatNgramSize,
    outName,
    target,
    repetitionPenalty,
    requestInit,
    src,
    selectedLanguage,
    selectedModel,
    selectedTask,
    setSelectedModal,
    setSidebarCollapsedState,
    strideLengthInSeconds,
    temperature,
    topK
  ]);
  const title = target === null ? `Transcribe ${displayName}` : "Generate captions";
  return /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_4v0n76tw_mjs__rspack_import_2/* .DismissableModal */.sbH, {
    ariaLabel: title,
    children: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsxs)("div", {
      style: transcriptionModalStyle,
      children: [
        /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_4v0n76tw_mjs__rspack_import_2/* .ModalHeader */.rQ0, {
          title
        }),
        /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsxs)("div", {
          style: _index_x76vz7p6_mjs__rspack_import_10/* .container */.kL,
          children: [
            /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
              style: _index_x76vz7p6_mjs__rspack_import_10/* .flexer */.lw
            }),
            /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_4v0n76tw_mjs__rspack_import_2/* .Button */.$nd, {
              onClick: onAddToQueue,
              disabled: !canTranscribe,
              "aria-label": transcribeDisabledReason,
              style: {
                ..._index_x76vz7p6_mjs__rspack_import_10/* .buttonStyle */.i9,
                backgroundColor: canTranscribe ? _index_x76vz7p6_mjs__rspack_import_10/* .buttonStyle.backgroundColor */.i9.backgroundColor : _index_y3n5kfm7_mjs__rspack_import_12/* .BLUE_DISABLED */.er
              },
              children: target === null ? "Transcribe" : "Generate captions"
            })
          ]
        }),
        /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsxs)("div", {
          style: transcriptionLayout,
          children: [
            /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsxs)("div", {
              style: _index_x76vz7p6_mjs__rspack_import_10/* .leftSidebar */.K8,
              children: [
                /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_4v0n76tw_mjs__rspack_import_2/* .VerticalTab */.sMJ, {
                  autoFocus: true,
                  style: _index_x76vz7p6_mjs__rspack_import_10/* .horizontalTab */.So,
                  selected: tab === "transcribe",
                  onClick: () => setTab("transcribe"),
                  renderIcon: (color) => /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
                    style: _index_x76vz7p6_mjs__rspack_import_10/* .iconContainer */.zc,
                    children: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_4v0n76tw_mjs__rspack_import_2/* .TranscriptionIcon */.SLQ, {
                      color,
                      style: _index_x76vz7p6_mjs__rspack_import_10/* .icon */.Kk
                    })
                  }),
                  children: "Transcribe"
                }),
                /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_4v0n76tw_mjs__rspack_import_2/* .VerticalTab */.sMJ, {
                  style: _index_x76vz7p6_mjs__rspack_import_10/* .horizontalTab */.So,
                  selected: tab === "models",
                  onClick: () => setTab("models"),
                  renderIcon: (color) => /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
                    style: _index_x76vz7p6_mjs__rspack_import_10/* .iconContainer */.zc,
                    children: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_x76vz7p6_mjs__rspack_import_10/* .ModelsIcon */.oi, {
                      color,
                      style: _index_x76vz7p6_mjs__rspack_import_10/* .icon */.Kk
                    })
                  }),
                  children: "Models"
                }),
                /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_4v0n76tw_mjs__rspack_import_2/* .VerticalTab */.sMJ, {
                  style: _index_x76vz7p6_mjs__rspack_import_10/* .horizontalTab */.So,
                  selected: tab === "advanced",
                  onClick: () => setTab("advanced"),
                  renderIcon: (color) => /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
                    style: _index_x76vz7p6_mjs__rspack_import_10/* .iconContainer */.zc,
                    children: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_4v0n76tw_mjs__rspack_import_2/* .GearIcon */.L64, {
                      color,
                      style: _index_x76vz7p6_mjs__rspack_import_10/* .icon */.Kk
                    })
                  }),
                  children: "Advanced"
                })
              ]
            }),
            /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsxs)("div", {
              style: tab === "transcribe" ? settingsPanel : hiddenPanel,
              className: _index_x76vz7p6_mjs__rspack_import_10/* .VERTICAL_SCROLLBAR_CLASSNAME */.uV,
              children: [
                target === null ? /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(OutputSettings, {
                  exists,
                  onOutNameChange,
                  outName,
                  validationMessage: outputValidationMessage
                }) : null,
                target === null ? /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_4v0n76tw_mjs__rspack_import_2/* .RenderModalHr */.YbN, {}) : null,
                /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(ModelSettings, {
                  cachedModels,
                  selectedLanguage,
                  selectedModel,
                  selectedTask,
                  setSelectedLanguage,
                  setSelectedModel,
                  setSelectedTask,
                  supportState
                })
              ]
            }),
            /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)("div", {
              style: tab === "advanced" ? advancedPanel : hiddenPanel,
              className: _index_x76vz7p6_mjs__rspack_import_10/* .VERTICAL_SCROLLBAR_CLASSNAME */.uV,
              children: /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(AdvancedSettings, {
                chunkLengthInSeconds,
                decodingValidationMessage,
                doSample,
                forceFullSequences,
                noRepeatNgramSize,
                repetitionPenalty,
                setChunkLengthInSeconds,
                setDoSample,
                setForceFullSequences,
                setNoRepeatNgramSize,
                setRepetitionPenalty,
                setStrideLengthInSeconds,
                setTemperature,
                setTopK,
                strideLengthInSeconds,
                temperature,
                topK,
                validationMessage: chunkValidationMessage
              })
            }),
            /* @__PURE__ */ (0,react_jsx_runtime__rspack_import_17.jsx)(_index_a5mre0mn_mjs__rspack_import_8/* .Models */.B, {
              description: `Models are downloaded automatically when needed.
You can also manage the browser cache here.`,
              indent: true,
              visible: tab === "models"
            })
          ]
        })
      ]
    })
  });
};



},
6429(__unused_rspack___webpack_module__, __webpack_exports__, __webpack_require__) {
__webpack_require__.d(__webpack_exports__, {
  X: () => (useModelCacheStatus)
});
/* import */ var react__rspack_import_0 = __webpack_require__(6540);
// src/components/use-model-cache-status.ts

var useModelCacheStatus = ({
  isModelCached,
  models,
  refreshKey
}) => {
  const [cachedModels, setCachedModels] = (0,react__rspack_import_0.useState)(new Set);
  (0,react__rspack_import_0.useEffect)(() => {
    let cancelled = false;
    Promise.all(models.map(async ({ name }) => ({
      cached: await isModelCached(name),
      name
    }))).then((results) => {
      if (!cancelled) {
        const nextCachedModels = new Set;
        for (const result of results) {
          if (result.cached) {
            nextCachedModels.add(result.name);
          }
        }
        setCachedModels(nextCachedModels);
      }
    }).catch(() => {
      if (!cancelled) {
        setCachedModels(new Set);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isModelCached, models, refreshKey]);
  return cachedModels;
};




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
//# sourceMappingURL=2.bundle.js.map
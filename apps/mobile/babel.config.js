module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@/components/nativewindui": "../../packages/nativewindui",
            "@/theme": "./src/theme",
            "@/lib": "./src/lib",
            "@": "./src",
            "~": "./",
          },
        },
      ],
    ],
  };
};

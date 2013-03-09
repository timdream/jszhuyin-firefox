# JSZhuyin IME for Firefox

An offine Smart Zhuyin IME add-on for Firefox.
Built on top of [JSZhuyin](https://github.com/timdream/jszhuyin) and [add-on SDK](https://addons.mozilla.org/en-US/developers/builder).

## License

MIT License

## Build

[Install add-on SDK](https://addons.mozilla.org/en-US/developers/docs/sdk/latest/dev-guide/tutorials/installation.html), with command-line `cfx` tool. Run the following command:

    git submodule init && git submodule update # Pull JSZhuyin repo into submodule
    make -C data/jszhuyin data # Pull JSZhuyin data from McBopomofo
    cfx xpi # Pack XPI

`jszhuyin-ime.xpi` will be available at the root of the repository.

Refer to [add-on SDK documentation](https://addons.mozilla.org/en-US/developers/docs/sdk/latest/dev-guide/tutorials/getting-started-with-cfx.html) on more usage of `cfx` tool, such as `cfx run`.

## Usage

(**experimental**, until I find a way to better integrate the IME with Firefox)

Focus on an input field first, and press **Ctrl+Alt+1** (**Command+Option+1** on Mac) to invoke IME panel. Type Zhuyin symbols to start composing Chinese characters, navigate through candidates with arrow keys. Select a candidate or press *Enter* to commit text.

The IME panel will not go away unless you press *Escape*.
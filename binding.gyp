{
  'targets': [
    {
      'target_name': 'gpu',
      'dependencies': [
        "<!(node -p \"require('node-addon-api').gyp\")",
      ],
      'sources': [
        'gpu.cc',
      ],
      # Use pre-built libs
      'include_dirs': [
        "<!@(node -p \"require('node-addon-api').include\")",
      ],
      'libraries': [
        # References LVML
        '<!@(ldconfig -p | grep "libnvidia-ml.so " | sed -n -e \'s/^.* => \\(.*\\)$/\\1/p\')',
        # Boosts internal calls
        '-Wl,-Bsymbolic-functions',
      ],
      'cflags!': [ '-fno-exceptions' ],
      'cflags_cc!': [ '-fno-exceptions' ],
      'cflags_cc': [
        '-std=c++17',
        '-fexceptions',
        '-fpermissive',
        '-Wall',
        '-O3',
      ],
    },
  ],
}

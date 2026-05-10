# Copyright 2026 Jamie-Leigh Blake and Termin project contributors
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0

from setuptools import setup, find_packages

setup(
    name="termin-airlock-provider",
    version="0.9.4.dev0",
    description="Termin presentation provider for Airlock — the Clarity Intelligence AI-fluency assessment",
    long_description=open("README.md", encoding="utf-8").read(),
    long_description_content_type="text/markdown",
    author="Jamie-Leigh Blake",
    license="Apache-2.0",
    url="https://github.com/jamieleigh3d/termin-airlock-provider",
    project_urls={
        "Homepage": "https://termin.dev",
        "Source": "https://github.com/jamieleigh3d/termin-airlock-provider",
        "Issues": "https://github.com/jamieleigh3d/termin-airlock-provider/issues",
    },
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    include_package_data=True,
    package_data={
        # Built bundle artifacts ship as package data. Built in CI;
        # not committed (see .gitignore). Wheel-builds on release tags
        # produce the artifacts and bake them in. Vite emits the JS
        # bundle, its source map, and an extracted CSS file; the
        # runtime serves all three from the static/ directory.
        "termin_airlock_provider": [
            "static/bundle.js",
            "static/bundle.js.map",
            "static/style.css",
        ],
    },
    python_requires=">=3.11",
    install_requires=[
        # The v0.9 family ships in lockstep. termin-core defines the
        # Protocol surface this provider implements; termin-server
        # supplies the registration helpers and ContractRegistry the
        # tests exercise. Pin to the v0.9 line until the family
        # stabilizes together.
        "termin-core>=0.9.0,<0.10",
        "termin-server>=0.9.0,<0.10",
        # Jinja2 is needed for the SSR placeholder shells in slice A1
        # and the real shells in slice A2.
        "jinja2>=3.1",
    ],
    extras_require={
        "test": [
            "pytest>=8",
            "pytest-asyncio>=0.21",
        ],
    },
    entry_points={
        # Termin runtime auto-discovers presentation providers via this
        # entry-point group at app startup. The value is a callable
        # `register_<product>(provider_registry, contract_registry)`
        # that registers the provider against its declared contracts.
        # See BRD §10 (one loading path for all providers).
        "termin.providers": [
            "airlock = termin_airlock_provider:register_airlock",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries",
    ],
)

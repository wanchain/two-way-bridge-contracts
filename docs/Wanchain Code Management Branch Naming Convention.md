Branch Naming Guidelines
========================

To better manage code branches within our team, we have established the following naming conventions for branches.

Basic Format
------------

Each branch name should consist of three parts:

```bash
{type}/{feature-name}-v{version}
```

where:

*   type: the type of the branch, which can be one of the following: dev, testnet, release
*   feature-name: the name of the feature or module that the branch involves (optional)
*   version: the version number that the branch corresponds to, as a number preceded by "v"

All types of version numbers should use 2 digits. The complete bridge code does not include the `feature-name` field.

For example:

*   dev/gpk-v1.2
*   testnet/v1.2
*   release/v1.2

Branch Types
------------

We define the following branch types:

*   dev: development branch, used when developing new features or fixing existing issues.
*   testnet: test network branch, used when testing the network.
*   release: release branch, used when releasing a new version.

Feature Name
------------

When naming feature names, please use a single word or lowercase letters and hyphens to separate words. For example:

*   nft
*   gpk
*   sol0.7-optimistic

Version Number
--------------

The version number should start with "v", followed by one or more digits, with each digit separated by a period. For example:

*   v1.0

Conclusion
----------

By following these naming conventions, we hope to better organize our code branches and make it easier for our team members to understand the content and purpose of each branch.
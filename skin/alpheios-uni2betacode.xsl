<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">

  <xsl:output method="text"/>
  <xsl:include href="uni2betacode.xsl"/>

  <xsl:param name="input"/>
  <xsl:param name="upper" select="false()"/>

  <xsl:template match="/">
    <xsl:call-template name="uni-to-beta">
      <xsl:with-param name="input" select="$input"/>
      <xsl:with-param name="upper" select="$upper"/>
    </xsl:call-template>
  </xsl:template>

</xsl:stylesheet>

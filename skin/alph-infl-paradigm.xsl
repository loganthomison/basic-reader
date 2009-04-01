<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
    xmlns:xhtml="http://www.w3.org/1999/xhtml"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    xmlns:exsl="http://exslt.org/common">

    <xsl:import href="alph-infl-extras.xsl"/>
    <xsl:import href="alph-infl-match.xsl"/>
    
    <xsl:output encoding="UTF-8" indent="yes" method="html"/>
     <xsl:strip-space elements="*"/>
    
    <xsl:param name="match_pofs"/>
    <!-- the following are optional, used to select specific inflection ending(s) -->
    <xsl:param name="selected_endings" select="/.." />
    
    <xsl:param name="form" />
    
    <!-- by default greek vowel length is stripped but this can be overridden -->
    <xsl:param name="strip_greek_vowel_length" select="true()"/>
    
    <!-- transliterate unicode in the ending tables before matching? -->
    <xsl:param name="translit_ending_table_match" select="false()"/>
    
    <!-- skip the enclosing html and body tags -->
    <xsl:param name="fragment" />
    
    <xsl:param name="paradigm_id"/>
    
    <xsl:key name="footnotes" match="footnote" use="@id"/>
    
    <xsl:template match="/infl-paradigms">
        <xsl:variable name="table-notes">
            <xsl:if test="@footnote">
                <div id="table-notes">
                    <xsl:call-template name="add-footnote">
                        <xsl:with-param name="item" select="."/>
                    </xsl:call-template>
                </div>
            </xsl:if>    
        </xsl:variable>
        
        <xsl:variable name="data">
            <xsl:choose>
                <xsl:when test="$paradigm_id">
                    <xsl:copy-of select="//infl-paradigm[@id=$paradigm_id]"/>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:copy-of select="//infl-paradigm"/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:variable>
        <xsl:choose>
            <xsl:when test="$fragment">
                <xsl:copy-of select="$table-notes"/>
                <div id="alph-infl-table">
                        <xsl:apply-templates select="exsl:node-set($data)"/>
                </div>
            </xsl:when>
            <xsl:otherwise>
                <html>
                    <head>
                        <link rel="stylesheet" type="text/css" href="chrome://alpheios/skin/alph-infl.css"/>
                        <link rel="stylesheet" type="text/css" href="chrome://alpheios/skin/alph-infl-paradigm.css"/>
                        <xsl:if test="$match_pofs">
                            <link rel="stylesheet" type="text/css" href="chrome://alpheios/skin/alph-infl-{$match_pofs}.css"/>
                        </xsl:if>
                    </head>
                    <body>
                        <xsl:copy-of select="$table-notes"/>
                        <xsl:apply-templates select="exsl:node-set($data)"/>
                    </body>
                </html>                
            </xsl:otherwise>
        </xsl:choose>            
    </xsl:template>
        
    <xsl:template match="infl-paradigm">
        <div id="{@id}">
            <div class="title"><xsl:apply-templates select="title"/></div>
            <xsl:apply-templates select="table"/>
        </div>
    </xsl:template>
    
    <xsl:template match="table">
        <xsl:element name="table">
            <xsl:attribute name="class"><xsl:value-of select="@role"/></xsl:attribute>
            <xsl:for-each select="row">
                <xsl:element name="tr">
                    <xsl:attribute name="class"><xsl:value-of select="@role"/></xsl:attribute>
                    <xsl:for-each select="cell">
                        <xsl:if test="@role = 'label'">
                            <xsl:element name="th">
                                <xsl:variable name="class">
                                    <xsl:if test="not(following-sibling::cell[1]/text())"><xsl:text>next-empty </xsl:text></xsl:if>
                                    <xsl:if test="not(preceding-sibling::cell[1]/text())"><xsl:text>prev-empty </xsl:text></xsl:if>
                                    <xsl:if test="../@role='data' and following-sibling::cell[1]/@role[. = 'label']"><xsl:text>next-label </xsl:text></xsl:if>
                                    <xsl:if test="../@role='data' and preceding-sibling::cell[1]/@role[. = 'label']"><xsl:text>prev-label </xsl:text></xsl:if>
                                    <xsl:if test="not(text())"><xsl:text>empty-cell </xsl:text></xsl:if>
                                </xsl:variable>
                                <xsl:attribute name="class"><xsl:value-of select="$class"/></xsl:attribute>
                                <xsl:for-each select="@*[local-name(.) !='role']">
                                    <xsl:attribute name="{concat('alph-',local-name(.))}"><xsl:value-of select="."/></xsl:attribute>
                                </xsl:for-each>
                                <xsl:apply-templates/>
                            </xsl:element>
                        </xsl:if>
                        <xsl:if test="@role='data'">
                            <xsl:element name="td">
                                <xsl:for-each select="@*[local-name(.) !='role']">
                                    <xsl:attribute name="{concat('alph-',local-name(.))}"><xsl:value-of select="."/></xsl:attribute>
                                </xsl:for-each>
                                <xsl:call-template name="add-footnote">
                                    <xsl:with-param name="item" select="."/>
                                </xsl:call-template>
                                <xsl:apply-templates/>
                                <!--
                                <div class="attributes">
                                    <xsl:for-each select="@*[local-name(.) !='role']">
                                        <xsl:value-of select="."/> 
                                        <xsl:text> </xsl:text>
                                    </xsl:for-each>
                                </div>
                                -->
                            </xsl:element>
                        </xsl:if>
                    </xsl:for-each>
                </xsl:element>
            </xsl:for-each>
        </xsl:element>
    </xsl:template>
     
     <xsl:template match="span">
         <xsl:copy-of select="."/>
     </xsl:template>
        
        <xsl:template match="reflink">
            <a href="{@xlink:href}" class="alph-reflink"><xsl:value-of select="."/></a>
        </xsl:template>
        
</xsl:stylesheet>
